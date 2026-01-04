import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { api } from '@/services/api';

interface DashboardStats {
  totalUsers: number;
  totalCompetitions: number;
  totalProblemBanks: number;
  pendingApplications: number;
  activeCompetitions: number;
  recentUsers: Array<{
    _id: string;
    nickname: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
}

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get<{ success: boolean; data: DashboardStats }>('/admin/stats');
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [t]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  const statCards = [
    { label: t('admin.totalUsers', 'Total Users'), value: stats?.totalUsers || 0, link: '/admin/users', color: 'text-[var(--color-blue)]' },
    { label: t('admin.totalCompetitions', 'Total Competitions'), value: stats?.totalCompetitions || 0, link: '/competitions', color: 'text-[var(--color-success)]' },
    { label: t('admin.totalProblemBanks', 'Problem Banks'), value: stats?.totalProblemBanks || 0, link: '/problems', color: 'text-[var(--color-purple)]' },
    { label: t('admin.pendingApplications', 'Pending Applications'), value: stats?.pendingApplications || 0, link: '/admin/applications', color: 'text-[var(--color-orange)]' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('admin.dashboard', 'Admin Dashboard')}</h1>

      {error && (
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.link}>
            <GlassCard className="p-6 transition-transform hover:scale-[1.02]">
              <p className="text-sm text-[var(--color-muted)]">{stat.label}</p>
              <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
            </GlassCard>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('admin.quickActions', 'Quick Actions')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Link
            to="/admin/applications"
            className="rounded-lg bg-[var(--color-orange-bg)] p-4 text-center transition-colors hover:opacity-80"
          >
            <p className="font-medium">{t('admin.reviewApplications', 'Review Applications')}</p>
            {stats?.pendingApplications ? (
              <p className="text-sm text-[var(--color-orange)]">{stats.pendingApplications} pending</p>
            ) : null}
          </Link>
          <Link
            to="/admin/users"
            className="rounded-lg bg-[var(--color-blue-bg)] p-4 text-center transition-colors hover:opacity-80"
          >
            <p className="font-medium">{t('admin.manageUsers', 'Manage Users')}</p>
          </Link>
          <Link
            to="/competitions/create"
            className="rounded-lg bg-[var(--color-success-bg)] p-4 text-center transition-colors hover:opacity-80"
          >
            <p className="font-medium">{t('admin.createCompetition', 'Create Competition')}</p>
          </Link>
          <Link
            to="/problems/create"
            className="rounded-lg bg-[var(--color-purple-bg)] p-4 text-center transition-colors hover:opacity-80"
          >
            <p className="font-medium">{t('admin.createProblemBank', 'Create Problem Bank')}</p>
          </Link>
        </div>
      </GlassCard>

      {/* Recent Users */}
      {stats?.recentUsers && stats.recentUsers.length > 0 && (
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('admin.recentUsers', 'Recent Users')}</h2>
            <Link to="/admin/users" className="text-sm text-[var(--color-primary)]">
              {t('common.viewAll', 'View All')}
            </Link>
          </div>
          <div className="space-y-2">
            {stats.recentUsers.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between rounded-lg bg-[var(--color-card)] p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/20 font-medium">
                    {user.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{user.nickname}</p>
                    <p className="text-sm text-[var(--color-muted)]">{user.email}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${
                  user.role === 'super_admin' ? 'bg-[var(--color-red-bg)] text-[var(--color-red)]' :
                  user.role === 'admin' ? 'bg-[var(--color-orange-bg)] text-[var(--color-orange)]' :
                  user.role === 'teacher' ? 'bg-[var(--color-blue-bg)] text-[var(--color-blue)]' :
                  'bg-[var(--color-secondary)] text-[var(--color-muted)]'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
