import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { useNotificationStore } from '@/store/notificationStore';
import type { Notification } from '@/services/notification.api';

export function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    notifications,
    total,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotificationStore();

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const limit = 20;

  useEffect(() => {
    fetchNotifications(page, limit, filter === 'unread');
  }, [page, filter, fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'teacher_application_submitted':
        return '📋';
      case 'teacher_application_approved':
        return '✅';
      case 'teacher_application_rejected':
        return '❌';
      case 'competition_participant_joined':
        return '👋';
      case 'competition_started':
        return '🚀';
      case 'competition_ended':
        return '🏁';
      case 'competition_result':
        return '🏆';
      case 'system':
        return '📢';
      default:
        return '🔔';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('notification.title', 'Notifications')}</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[var(--color-muted)] mt-1">
              {t('notification.unreadCount', '{{count}} unread', { count: unreadCount })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              {t('notification.markAllRead', 'Mark all as read')}
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              className="text-[var(--color-error)]"
              onClick={deleteAllNotifications}
            >
              {t('notification.deleteAll', 'Delete all')}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setFilter('all'); setPage(1); }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-card)] hover:bg-[var(--color-card)]/80'
          }`}
        >
          {t('notification.filter.all', 'All')}
        </button>
        <button
          onClick={() => { setFilter('unread'); setPage(1); }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-card)] hover:bg-[var(--color-card)]/80'
          }`}
        >
          {t('notification.filter.unread', 'Unread')}
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-[var(--color-error)] px-2 py-0.5 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <IconLoading size={48} state="loading" />
        </div>
      ) : notifications.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="text-5xl mb-4 opacity-50">🔔</div>
          <p className="text-[var(--color-muted)]">
            {filter === 'unread'
              ? t('notification.noUnread', 'No unread notifications')
              : t('notification.empty', 'No notifications yet')}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <GlassCard
              key={notification._id}
              className={`p-4 cursor-pointer hover:border-[var(--color-primary)]/50 transition-colors ${
                !notification.read ? 'border-l-4 border-l-[var(--color-primary)]' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex gap-4">
                <span className="text-2xl flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${!notification.read ? '' : 'text-[var(--color-muted)]'}`}>
                        {notification.title.split(' / ')[0]}
                      </h3>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]"></span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, notification._id)}
                      className="text-[var(--color-muted)] hover:text-[var(--color-error)] transition-colors p-1"
                      title={t('common.delete', 'Delete')}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-[var(--color-muted)] mt-1">
                    {notification.message.split(' / ')[0]}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] mt-2">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t('common.previous', 'Previous')}
          </Button>
          <span className="text-sm text-[var(--color-muted)]">
            {t('common.pageOf', 'Page {{current}} of {{total}}', { current: page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {t('common.next', 'Next')}
          </Button>
        </div>
      )}
    </div>
  );
}
