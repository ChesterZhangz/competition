import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUserDocument } from '../models/user.model';
import { Session, ISessionDocument } from '../models/session.model';
import { VerificationCode } from '../models/verification-code.model';
import { jwtUtils, TokenPayload } from '../config/jwt';
import { redisHelpers } from '../config/redis';
import { emailService } from './email.service';
import { adminService } from './admin.service';
import type { RegisterInput, LoginInput } from '../validators/auth.validator';

const SALT_ROUNDS = 12;
const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;

// Use cryptographically secure random number generator
function generateVerificationCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += crypto.randomInt(0, 10).toString();
  }
  return code;
}

export class AuthService {
  // Register a new user
  async register(input: RegisterInput): Promise<{ user: IUserDocument; accessToken: string; refreshToken: string }> {
    const { email, phone, password, nickname } = input;

    // Check if email domain is allowed
    if (email) {
      const emailCheck = await adminService.isEmailAllowed(email);
      if (!emailCheck.allowed) {
        throw new Error(emailCheck.reason || 'Email domain not allowed');
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });

    if (existingUser) {
      throw new Error('User with this email or phone already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await User.create({
      email,
      phone,
      passwordHash,
      nickname,
      role: 'student',
      status: 'active',
    });

    // Generate tokens
    const { accessToken, refreshToken, session } = await this.createSession(user);

    return { user, accessToken, refreshToken };
  }

  // Login user
  async login(input: LoginInput): Promise<{ user: IUserDocument; accessToken: string; refreshToken: string }> {
    const { email, phone, password } = input;

    // Find user
    const user = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check user status
    if (user.status === 'banned') {
      throw new Error('Account is banned');
    }

    if (user.status === 'inactive') {
      throw new Error('Account is inactive');
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.createSession(user);

    return { user, accessToken, refreshToken };
  }

  // Create a new session
  async createSession(user: IUserDocument, deviceInfo?: { userAgent: string; ipAddress?: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    session: ISessionDocument;
  }> {
    const refreshTokenExpiry = jwtUtils.getRefreshTokenExpiry();

    // Create session in database first to get the MongoDB _id
    const session = await Session.create({
      userId: user._id,
      refreshToken: 'pending', // Will be updated below
      deviceInfo: deviceInfo ? {
        userAgent: deviceInfo.userAgent,
      } : undefined,
      ipAddress: deviceInfo?.ipAddress,
      isActive: true,
      expiresAt: new Date(Date.now() + refreshTokenExpiry * 1000),
    });

    // Use MongoDB _id as sessionId for consistency
    const sessionId = session._id.toString();

    // Generate tokens with the actual session ID
    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId,
    };

    const accessToken = jwtUtils.generateAccessToken(tokenPayload);
    const refreshToken = jwtUtils.generateRefreshToken({
      userId: user._id.toString(),
      sessionId,
    });

    // Update the session with the actual refresh token
    session.refreshToken = refreshToken;
    await session.save();

    // Store session in Redis for faster lookup
    await redisHelpers.setSession(
      user._id.toString(),
      sessionId,
      { userId: user._id.toString(), role: user.role },
      refreshTokenExpiry
    );

    return { accessToken, refreshToken, session };
  }

  // Refresh tokens
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token
    const payload = jwtUtils.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // Find session
    const session = await Session.findOne({
      refreshToken,
      isActive: true,
    });

    if (!session) {
      throw new Error('Session not found or expired');
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await Session.updateOne({ _id: session._id }, { isActive: false });
      throw new Error('Session expired');
    }

    // Find user
    const user = await User.findById(session.userId);
    if (!user || user.status !== 'active') {
      throw new Error('User not found or inactive');
    }

    // Invalidate old session
    await Session.updateOne({ _id: session._id }, { isActive: false });
    await redisHelpers.deleteSession(payload.userId, payload.sessionId);

    // Create new session
    const result = await this.createSession(user);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  // Logout
  async logout(userId: string, sessionId: string): Promise<void> {
    await Session.updateOne(
      { userId, _id: sessionId },
      { isActive: false }
    );
    await redisHelpers.deleteSession(userId, sessionId);
  }

  // Logout all sessions
  async logoutAll(userId: string): Promise<void> {
    await Session.updateMany(
      { userId },
      { isActive: false }
    );
    // Redis sessions will expire automatically
  }

  // Get current user
  async getCurrentUser(userId: string): Promise<IUserDocument | null> {
    return User.findById(userId).select('-passwordHash');
  }

  // Verify token and get user
  async verifyToken(token: string): Promise<{ user: IUserDocument; payload: TokenPayload } | null> {
    const payload = jwtUtils.verifyAccessToken(token);
    if (!payload) {
      return null;
    }

    // Check Redis cache first
    const cachedSession = await redisHelpers.getSession(payload.userId, payload.sessionId);
    if (!cachedSession) {
      // Verify against database
      const session = await Session.findOne({
        userId: payload.userId,
        isActive: true,
      });
      if (!session) {
        return null;
      }
    }

    const user = await User.findById(payload.userId).select('-passwordHash');
    if (!user || user.status !== 'active') {
      return null;
    }

    return { user, payload };
  }

  // Create guest user
  async createGuestUser(nickname: string): Promise<{ user: IUserDocument; accessToken: string; refreshToken: string }> {
    const user = await User.create({
      nickname,
      role: 'guest',
      status: 'active',
    });

    const { accessToken, refreshToken } = await this.createSession(user);

    return { user, accessToken, refreshToken };
  }

  // Send verification code
  async sendVerificationCode(email: string, type: 'register' | 'reset'): Promise<void> {
    // For register, check if email domain is allowed
    if (type === 'register') {
      const emailCheck = await adminService.isEmailAllowed(email);
      if (!emailCheck.allowed) {
        throw new Error(emailCheck.reason || 'Email domain not allowed');
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email is already registered');
      }
    }

    // For reset, check if user exists
    if (type === 'reset') {
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        // Don't reveal that email doesn't exist for security
        // But still return success to prevent email enumeration
        return;
      }
    }

    // Invalidate any existing codes
    await VerificationCode.updateMany(
      { target: email, purpose: type === 'register' ? 'register' : 'reset_password', verified: false },
      { verified: true }
    );

    // Generate new code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await VerificationCode.create({
      target: email,
      targetType: 'email',
      code,
      purpose: type === 'register' ? 'register' : 'reset_password',
      expiresAt,
    });

    // Send email
    await emailService.sendVerificationCode(email, code, type);
  }

  // Verify code
  async verifyCode(email: string, code: string, type: 'register' | 'reset'): Promise<boolean> {
    const purpose = type === 'register' ? 'register' : 'reset_password';

    const verificationCode = await VerificationCode.findOne({
      target: email,
      purpose,
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!verificationCode) {
      throw new Error('Invalid or expired verification code');
    }

    if (verificationCode.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new Error('Too many attempts. Please request a new code.');
    }

    if (verificationCode.code !== code) {
      verificationCode.attempts += 1;
      await verificationCode.save();
      throw new Error('Invalid verification code');
    }

    // Mark as verified
    verificationCode.verified = true;
    await verificationCode.save();

    return true;
  }

  // Reset password
  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    // Verify the code first
    await this.verifyCode(email, code, 'reset');

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    user.passwordHash = passwordHash;
    await user.save();

    // Invalidate all existing sessions
    await this.logoutAll(user._id.toString());
  }

  // Register with verification code
  async registerWithVerification(input: RegisterInput & { verificationCode: string }): Promise<{ user: IUserDocument; accessToken: string; refreshToken: string }> {
    const { email, verificationCode, password, nickname } = input;

    if (!email) {
      throw new Error('Email is required');
    }

    // Check if email domain is allowed
    const emailCheck = await adminService.isEmailAllowed(email);
    if (!emailCheck.allowed) {
      throw new Error(emailCheck.reason || 'Email domain not allowed');
    }

    // Verify the code
    await this.verifyCode(email, verificationCode, 'register');

    // Proceed with registration
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      email,
      passwordHash,
      nickname,
      role: 'student',
      status: 'active',
      emailVerified: true,
    });

    const { accessToken, refreshToken } = await this.createSession(user);

    return { user, accessToken, refreshToken };
  }
}

export const authService = new AuthService();
