import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/auth.api';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();

  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (!formData.email) {
      setError(t('auth.emailRequired', 'Please enter your email first'));
      return;
    }

    setError('');
    setIsSendingCode(true);

    try {
      await authApi.sendVerificationCode(formData.email);
      setCodeSent(true);
      startCountdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.sendCodeFailed', 'Failed to send code'));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordMismatch', 'Passwords do not match'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('auth.passwordTooShort', 'Password must be at least 6 characters'));
      return;
    }

    if (!formData.verificationCode) {
      setError(t('auth.codeRequired', 'Please enter verification code'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        nickname: formData.nickname,
        verificationCode: formData.verificationCode,
      });
      setUser(response.user);
      setTokens(response.accessToken, response.refreshToken);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registerFailed', 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-background">
      <div className="auth-card">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">
            {t('auth.createAccount', 'Create Account')}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {t('auth.registerSubtitle', 'Join Math Competition Platform')}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="error-message mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nickname */}
          <div>
            <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium">
              {t('auth.nickname', 'Nickname')}
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              value={formData.nickname}
              onChange={handleChange}
              placeholder={t('auth.nicknamePlaceholder', 'Choose a nickname')}
              className="input-field"
              required
              minLength={2}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              {t('auth.email', 'Email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('auth.emailPlaceholder', 'Enter your email')}
              className="input-field"
              required
            />
          </div>

          {/* Verification Code */}
          <div>
            <label htmlFor="verificationCode" className="mb-1.5 block text-sm font-medium">
              {t('auth.verificationCode', 'Verification Code')}
            </label>
            <div className="flex gap-2">
              <input
                id="verificationCode"
                name="verificationCode"
                type="text"
                value={formData.verificationCode}
                onChange={handleChange}
                placeholder={t('auth.codePlaceholder', '6-digit code')}
                className="input-field flex-1"
                maxLength={6}
                required
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isSendingCode || countdown > 0}
                className="shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {isSendingCode ? (
                  <span className="spinner" />
                ) : countdown > 0 ? (
                  `${countdown}s`
                ) : codeSent ? (
                  t('auth.resend', 'Resend')
                ) : (
                  t('auth.sendCode', 'Send Code')
                )}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              {t('auth.password', 'Password')}
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder={t('auth.passwordPlaceholder', 'At least 6 characters')}
                className="input-field pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium">
              {t('auth.confirmPassword', 'Confirm Password')}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder={t('auth.confirmPasswordPlaceholder', 'Re-enter password')}
              className="input-field"
              required
            />
          </div>

          {/* Submit */}
          <button type="submit" className="btn-primary mt-2" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" />
                {t('auth.registering', 'Creating account...')}
              </span>
            ) : (
              t('auth.register', 'Create Account')
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
          {t('auth.hasAccount', 'Already have an account?')}{' '}
          <Link to="/login" className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
            {t('auth.login', 'Sign in')}
          </Link>
        </p>
      </div>
    </div>
  );
}
