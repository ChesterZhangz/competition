import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/services/auth.api';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

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
    if (!email) {
      setError(t('auth.emailRequired', 'Please enter your email'));
      return;
    }

    setError('');
    setIsSendingCode(true);

    try {
      await authApi.sendResetCode(email);
      setStep('reset');
      startCountdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.sendCodeFailed', 'Failed to send code'));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setIsSendingCode(true);
    try {
      await authApi.sendResetCode(email);
      startCountdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.sendCodeFailed', 'Failed to send code'));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch', 'Passwords do not match'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('auth.passwordTooShort', 'Password must be at least 6 characters'));
      return;
    }

    if (!code || code.length !== 6) {
      setError(t('auth.invalidCode', 'Please enter a valid 6-digit code'));
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(email, code, newPassword);
      navigate('/login', {
        state: { message: t('auth.passwordResetSuccess', 'Password reset successful! Please login.') }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.resetFailed', 'Failed to reset password'));
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
            {t('auth.forgotPassword', 'Forgot Password')}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {step === 'email'
              ? t('auth.forgotSubtitle', 'Enter your email to reset password')
              : t('auth.resetSubtitle', `Enter the code sent to ${email}`)}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="error-message mb-4">
            {error}
          </div>
        )}

        {step === 'email' ? (
          /* Step 1: Email */
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                {t('auth.email', 'Email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder', 'Enter your email')}
                className="input-field"
                required
              />
            </div>

            <button
              type="button"
              onClick={handleSendCode}
              className="btn-primary"
              disabled={isSendingCode}
            >
              {isSendingCode ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" />
                  {t('auth.sendingCode', 'Sending...')}
                </span>
              ) : (
                t('auth.sendResetCode', 'Send Reset Code')
              )}
            </button>
          </div>
        ) : (
          /* Step 2: Reset Password */
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Verification Code */}
            <div>
              <label htmlFor="code" className="mb-1.5 block text-sm font-medium">
                {t('auth.verificationCode', 'Verification Code')}
              </label>
              <div className="flex gap-2">
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t('auth.codePlaceholder', '6-digit code')}
                  className="input-field flex-1"
                  maxLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isSendingCode || countdown > 0}
                  className="shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {isSendingCode ? (
                    <span className="spinner" />
                  ) : countdown > 0 ? (
                    `${countdown}s`
                  ) : (
                    t('auth.resend', 'Resend')
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium">
                {t('auth.newPassword', 'New Password')}
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder', 'Re-enter password')}
                className="input-field"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" />
                  {t('auth.resetting', 'Resetting...')}
                </span>
              ) : (
                t('auth.resetPassword', 'Reset Password')
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('email')}
              className="btn-secondary"
            >
              {t('auth.back', 'Back')}
            </button>
          </form>
        )}

        {/* Back to login */}
        <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
          {t('auth.rememberPassword', 'Remember your password?')}{' '}
          <Link to="/login" className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
            {t('auth.backToLogin', 'Back to login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
