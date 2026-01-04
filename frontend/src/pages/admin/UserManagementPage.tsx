import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { adminApi } from '@/services/admin.api';
import type { User, UserRole } from '@/services/admin.api';
import { useAuthStore } from '@/store';

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  teacher: 60,
  student: 40,
  guest: 20,
};

export function UserManagementPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const limit = 20;
  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await adminApi.listUsers({
        page,
        limit,
        role: roleFilter !== 'all' ? (roleFilter as UserRole) : undefined,
        search: search || undefined,
      });
      setUsers(result.users);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  // Check if current user can edit target user's role
  const canEditRole = (targetUser: User): boolean => {
    if (!currentUser) return false;

    // Cannot edit yourself
    if (targetUser._id === currentUser.id) return false;

    const currentLevel = ROLE_HIERARCHY[currentUser.role as UserRole] || 0;
    const targetLevel = ROLE_HIERARCHY[targetUser.role] || 0;

    // Cannot edit users at same or higher level (unless super_admin)
    if (!isSuperAdmin && targetLevel >= currentLevel) return false;

    return true;
  };

  // Get available roles for target user based on current user's role
  const getAvailableRoles = (_targetUser: User): UserRole[] => {
    if (!currentUser) return [];

    const currentLevel = ROLE_HIERARCHY[currentUser.role as UserRole] || 0;

    // Super admin can assign any role
    if (isSuperAdmin) {
      return ['super_admin', 'admin', 'teacher', 'student', 'guest'];
    }

    // Admin can only assign roles lower than their own
    return (['admin', 'teacher', 'student', 'guest'] as UserRole[]).filter(
      (role) => ROLE_HIERARCHY[role] < currentLevel
    );
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    setActionLoading(userId);
    setError('');
    try {
      await adminApi.updateUserRole(userId, newRole);
      setUsers(users.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
      setEditingUser(null);
      setSuccessMessage(t('admin.roleUpdated', 'Role updated successfully'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.actionFailed', 'Action failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: 'active' | 'suspended') => {
    setActionLoading(userId);
    setError('');
    try {
      await adminApi.updateUserStatus(userId, newStatus);
      setUsers(users.map((u) => (u._id === userId ? { ...u, status: newStatus } : u)));
      setSuccessMessage(t('admin.statusUpdated', 'Status updated successfully'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.actionFailed', 'Action failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-[var(--color-red-bg)] text-[var(--color-red)]';
      case 'admin':
        return 'bg-[var(--color-orange-bg)] text-[var(--color-orange)]';
      case 'teacher':
        return 'bg-[var(--color-blue-bg)] text-[var(--color-blue)]';
      case 'student':
        return 'bg-[var(--color-success-bg)] text-[var(--color-success)]';
      default:
        return 'bg-[var(--color-secondary)] text-[var(--color-muted)]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-[var(--color-success-bg)] text-[var(--color-success)]';
      case 'suspended':
      case 'banned':
        return 'bg-[var(--color-error-bg)] text-[var(--color-error)]';
      default:
        return 'bg-[var(--color-secondary)] text-[var(--color-muted)]';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('admin.userManagement', 'User Management')}</h1>
        {isSuperAdmin && (
          <Link to="/admin/settings">
            <Button variant="outline">{t('admin.systemSettings', 'System Settings')}</Button>
          </Link>
        )}
      </div>

      {/* Current user info */}
      <div className="rounded-lg bg-[var(--color-primary)]/10 p-4">
        <p className="text-sm">
          {t('admin.loggedInAs', 'Logged in as')}: <strong>{currentUser?.nickname}</strong>{' '}
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${getRoleColor(currentUser?.role || '')}`}>
            {t(`roles.${currentUser?.role}`, currentUser?.role || '')}
          </span>
        </p>
        {!isSuperAdmin && (
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {t('admin.limitedPermissions', 'You have limited permissions. Only super admins can modify admin roles and system settings.')}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
      )}

      {successMessage && (
        <div className="rounded-lg bg-[var(--color-success-bg)] p-4 text-[var(--color-success)]">
          {successMessage}
        </div>
      )}

      {/* Search and Filter */}
      <GlassCard className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 gap-2">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.searchUsers', 'Search by email or nickname...')}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch}>{t('common.search', 'Search')}</Button>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-[var(--color-foreground)]"
          >
            <option value="all">{t('admin.allRoles', 'All Roles')}</option>
            <option value="super_admin">{t('roles.super_admin', 'Super Admin')}</option>
            <option value="admin">{t('roles.admin', 'Admin')}</option>
            <option value="teacher">{t('roles.teacher', 'Teacher')}</option>
            <option value="student">{t('roles.student', 'Student')}</option>
            <option value="guest">{t('roles.guest', 'Guest')}</option>
          </select>
        </div>
      </GlassCard>

      {/* Users Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">{t('admin.user', 'User')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium">{t('admin.role', 'Role')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium">{t('admin.statusLabel', 'Status')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium">{t('admin.joined', 'Joined')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium">{t('admin.lastLogin', 'Last Login')}</th>
                <th className="px-4 py-3 text-right text-sm font-medium">{t('admin.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-[var(--color-card)]/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/20 font-medium">
                        {user.nickname.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.nickname}
                          {user._id === currentUser?.id && (
                            <span className="ml-2 text-xs text-[var(--color-muted)]">
                              ({t('admin.you', 'You')})
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-[var(--color-muted)]">{user.email || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingUser?._id === user._id ? (
                      <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                        className="rounded border bg-[var(--color-card)] px-2 py-1 text-sm"
                      >
                        {getAvailableRoles(user).map((role) => (
                          <option key={role} value={role}>
                            {t(`roles.${role}`, role)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`rounded-full px-2 py-1 text-xs ${getRoleColor(user.role)}`}>
                        {t(`roles.${user.role}`, user.role)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(user.status)}`}>
                      {t(`status.${user.status}`, user.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-muted)]">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-muted)]">
                    {formatDate(user.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {editingUser?._id === user._id ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEditingUser(null)}>
                            {t('common.cancel', 'Cancel')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateRole(user._id, editingUser.role)}
                            disabled={actionLoading === user._id || editingUser.role === user.role}
                          >
                            {actionLoading === user._id ? (
                              <IconLoading size={16} state="loading" />
                            ) : (
                              t('common.save', 'Save')
                            )}
                          </Button>
                        </>
                      ) : (
                        <>
                          {canEditRole(user) && (
                            <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
                              {t('admin.changeRole', 'Change Role')}
                            </Button>
                          )}
                          {user._id !== currentUser?.id && (
                            <>
                              {user.status === 'active' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[var(--color-error)]"
                                  onClick={() => handleUpdateStatus(user._id, 'suspended')}
                                  disabled={actionLoading === user._id || !canEditRole(user)}
                                >
                                  {actionLoading === user._id ? (
                                    <IconLoading size={16} state="loading" />
                                  ) : (
                                    t('admin.suspend', 'Suspend')
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[var(--color-success)]"
                                  onClick={() => handleUpdateStatus(user._id, 'active')}
                                  disabled={actionLoading === user._id || !canEditRole(user)}
                                >
                                  {actionLoading === user._id ? (
                                    <IconLoading size={16} state="loading" />
                                  ) : (
                                    t('admin.activate', 'Activate')
                                  )}
                                </Button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && !isLoading && (
          <div className="py-12 text-center text-[var(--color-muted)]">
            {t('admin.noUsers', 'No users found')}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
            <p className="text-sm text-[var(--color-muted)]">
              {t('admin.showing', 'Showing')} {(page - 1) * limit + 1}-{Math.min(page * limit, total)}{' '}
              {t('admin.of', 'of')} {total}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t('common.previous', 'Previous')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total}
              >
                {t('common.next', 'Next')}
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
