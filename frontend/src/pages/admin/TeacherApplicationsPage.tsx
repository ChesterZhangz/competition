import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { api } from '@/services/api';

interface Application {
  _id: string;
  userId: {
    _id: string;
    nickname: string;
    email: string;
  };
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: {
    nickname: string;
  };
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

export function TeacherApplicationsPage() {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get<{ success: boolean; data: { applications: Application[] } }>(
        '/teacher-applications',
        { params }
      );
      if (response.data.success) {
        setApplications(response.data.data.applications);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (applicationId: string, action: 'approve' | 'reject', reviewNote?: string) => {
    setActionLoading(applicationId);
    try {
      await api.post(`/teacher-applications/${applicationId}/review`, { action, reviewNote });
      // Refresh list
      fetchApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.actionFailed', 'Action failed'));
    } finally {
      setActionLoading(null);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('admin.teacherApplications', 'Teacher Applications')}</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-card)] hover:bg-[var(--color-card)]/80'
            }`}
          >
            {t(`admin.filter.${status}`, status.charAt(0).toUpperCase() + status.slice(1))}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <p className="text-[var(--color-muted)]">
            {t('admin.noApplications', 'No applications found')}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <GlassCard key={app._id} className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-lg font-medium">
                      {app.userId.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{app.userId.nickname}</h3>
                      <p className="text-sm text-[var(--color-muted)]">{app.userId.email}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm ${getStatusColor(app.status)}`}>
                      {t(`admin.status.${app.status}`, app.status)}
                    </span>
                  </div>

                  <div className="mt-4 rounded-lg bg-[var(--color-card)] p-4">
                    <p className="mb-1 text-sm font-medium text-[var(--color-muted)]">
                      {t('admin.applicationReason', 'Reason for Application')}:
                    </p>
                    <p>{app.reason}</p>
                  </div>

                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {t('admin.appliedOn', 'Applied on')}: {formatDate(app.createdAt)}
                  </p>

                  {app.reviewedBy && (
                    <div className="mt-2 text-sm text-[var(--color-muted)]">
                      <p>
                        {t('admin.reviewedBy', 'Reviewed by')}: {app.reviewedBy.nickname}
                      </p>
                      {app.reviewedAt && (
                        <p>{t('admin.reviewedOn', 'Reviewed on')}: {formatDate(app.reviewedAt)}</p>
                      )}
                      {app.reviewNote && (
                        <p className="mt-1">
                          {t('admin.reviewNote', 'Note')}: {app.reviewNote}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {app.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
                      onClick={() => handleReview(app._id, 'reject')}
                      disabled={actionLoading === app._id}
                    >
                      {t('admin.reject', 'Reject')}
                    </Button>
                    <Button
                      onClick={() => handleReview(app._id, 'approve')}
                      disabled={actionLoading === app._id}
                    >
                      {actionLoading === app._id ? t('common.processing', 'Processing...') : t('admin.approve', 'Approve')}
                    </Button>
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
