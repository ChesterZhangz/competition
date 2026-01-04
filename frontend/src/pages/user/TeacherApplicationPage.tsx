import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

interface Application {
  _id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: {
    nickname: string;
  };
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

export function TeacherApplicationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [applications, setApplications] = useState<Application[]>([]);
  const [hasPending, setHasPending] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const [appsResponse, pendingResponse] = await Promise.all([
        api.get<{ success: boolean; data: { applications: Application[] } }>('/teacher-applications/mine'),
        api.get<{ success: boolean; data: { hasPending: boolean } }>('/teacher-applications/check-pending'),
      ]);

      if (appsResponse.data.success) {
        setApplications(appsResponse.data.data.applications);
      }
      if (pendingResponse.data.success) {
        setHasPending(pendingResponse.data.data.hasPending);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (reason.trim().length < 10) {
      setError(t('application.reasonTooShort', 'Please provide a more detailed reason (at least 10 characters)'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/teacher-applications', { reason: reason.trim() });
      setSuccess(t('application.submitted', 'Your application has been submitted successfully!'));
      setReason('');
      setHasPending(true);
      fetchApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.submitFailed', 'Failed to submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-[var(--color-success-bg)] text-[var(--color-success)]';
      case 'rejected': return 'bg-[var(--color-error-bg)] text-[var(--color-error)]';
      default: return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // If user is already a teacher or higher, show message
  if (user?.role && ['teacher', 'admin', 'super_admin'].includes(user.role)) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">{t('application.title', 'Become a Teacher')}</h1>
        <GlassCard className="p-8 text-center">
          <div className="mb-4 text-5xl">🎉</div>
          <p className="text-xl">
            {t('application.alreadyTeacher', 'You are already a teacher!')}
          </p>
          <Button className="mt-6" onClick={() => navigate('/problems')}>
            {t('application.goToProblems', 'Go to Problem Banks')}
          </Button>
        </GlassCard>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">{t('application.title', 'Become a Teacher')}</h1>

      {/* Info */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('application.benefits', 'Teacher Benefits')}</h2>
        <ul className="space-y-2 text-[var(--color-muted)]">
          <li className="flex items-center gap-2">
            <span className="text-[var(--color-success)]">✓</span>
            {t('application.benefit1', 'Create and manage problem banks')}
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--color-success)]">✓</span>
            {t('application.benefit2', 'Create and host competitions')}
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--color-success)]">✓</span>
            {t('application.benefit3', 'Access to advanced features')}
          </li>
        </ul>
      </GlassCard>

      {/* Application Form */}
      {!hasPending && (
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('application.applyNow', 'Apply Now')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
            )}
            {success && (
              <div className="rounded-lg bg-[var(--color-success-bg)] p-4 text-[var(--color-success)]">{success}</div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                {t('application.reason', 'Why do you want to become a teacher?')}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('application.reasonPlaceholder', 'Please explain your background, experience, and why you want to create problems...')}
                rows={5}
                minLength={10}
                maxLength={500}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
              />
              <p className="text-sm text-[var(--color-muted)]">
                {reason.length}/500 {t('application.characters', 'characters')}
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting || reason.trim().length < 10}>
              {isSubmitting ? t('common.submitting', 'Submitting...') : t('application.submit', 'Submit Application')}
            </Button>
          </form>
        </GlassCard>
      )}

      {/* Pending Application Notice */}
      {hasPending && (
        <GlassCard className="border-[var(--color-warning)]/50 p-6">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⏳</div>
            <div>
              <h3 className="font-semibold text-[var(--color-warning)]">
                {t('application.pendingTitle', 'Application Pending')}
              </h3>
              <p className="text-[var(--color-muted)]">
                {t('application.pendingDesc', 'Your application is being reviewed. We will notify you once a decision is made.')}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Application History */}
      {applications.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('application.history', 'Application History')}</h2>
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app._id}
                className="rounded-lg border border-[var(--color-border)] p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-[var(--color-muted)]">
                    {formatDate(app.createdAt)}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-sm ${getStatusColor(app.status)}`}>
                    {t(`application.status.${app.status}`, app.status)}
                  </span>
                </div>
                <p className="text-sm">{app.reason}</p>
                {app.reviewNote && (
                  <div className="mt-3 rounded bg-[var(--color-card)] p-3">
                    <p className="text-sm text-[var(--color-muted)]">
                      <strong>{t('application.reviewNote', 'Review Note')}:</strong> {app.reviewNote}
                    </p>
                    {app.reviewedBy && (
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {t('application.reviewedBy', 'Reviewed by')}: {app.reviewedBy.nickname}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
