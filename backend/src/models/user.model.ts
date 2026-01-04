import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'guest';

export interface IOAuthProvider {
  provider: 'google' | 'github' | 'wechat';
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface IUserDocument extends Document {
  email?: string;
  phone?: string;
  passwordHash?: string;
  nickname: string;
  avatar?: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'banned';
  emailVerified?: boolean;
  oauthProviders?: IOAuthProvider[];
  createdAt: Date;
  updatedAt: Date;
}

const OAuthProviderSchema = new Schema<IOAuthProvider>(
  {
    provider: {
      type: String,
      enum: ['google', 'github', 'wechat'],
      required: true,
    },
    providerId: { type: String, required: true },
    accessToken: String,
    refreshToken: String,
  },
  { _id: false }
);

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    passwordHash: String,
    nickname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    avatar: String,
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'teacher', 'student', 'guest'],
      default: 'student',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    oauthProviders: [OAuthProviderSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ nickname: 'text' });

export const User = mongoose.model<IUserDocument>('User', UserSchema);
