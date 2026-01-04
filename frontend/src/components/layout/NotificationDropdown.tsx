import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';
import { IconBell } from '@/components/icons/notification/IconBell';
import { IconClipboard } from '@/components/icons/notification/IconClipboard';
import { IconCheckCircle } from '@/components/icons/notification/IconCheckCircle';
import { IconXCircle } from '@/components/icons/notification/IconXCircle';
import { IconUserPlus } from '@/components/icons/notification/IconUserPlus';
import { IconRocket } from '@/components/icons/notification/IconRocket';
import { IconFlag } from '@/components/icons/notification/IconFlag';
import { IconMegaphone } from '@/components/icons/notification/IconMegaphone';
import { IconTrophy } from '@/components/icons/competition/IconTrophy';

export function NotificationDropdown() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchNotifications(1, 10);
    }
  }, [isOpen, isAuthenticated, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }
    setIsOpen(false);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const getNotificationIcon = (type: string): ReactNode => {
    const iconProps = { size: 20, className: 'text-[var(--color-primary)]' };

    switch (type) {
      case 'teacher_application_submitted':
        return <IconClipboard {...iconProps} />;
      case 'teacher_application_approved':
        return <IconCheckCircle {...iconProps} className="text-green-500" />;
      case 'teacher_application_rejected':
        return <IconXCircle {...iconProps} className="text-red-500" />;
      case 'competition_participant_joined':
        return <IconUserPlus {...iconProps} />;
      case 'competition_started':
        return <IconRocket {...iconProps} />;
      case 'competition_ended':
        return <IconFlag {...iconProps} />;
      case 'competition_result':
        return <IconTrophy {...iconProps} className="text-yellow-500" />;
      case 'system':
        return <IconMegaphone {...iconProps} />;
      default:
        return <IconBell {...iconProps} />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notification.justNow', 'Just now');
    if (diffMins < 60) return t('notification.minutesAgo', '{{count}} min ago', { count: diffMins });
    if (diffHours < 24) return t('notification.hoursAgo', '{{count}} hr ago', { count: diffHours });
    if (diffDays < 7) return t('notification.daysAgo', '{{count}} day ago', { count: diffDays });
    return date.toLocaleDateString();
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 hover:bg-[var(--color-secondary)] transition-colors"
        aria-label={t('notification.notifications', 'Notifications')}
      >
        <IconBell size={20} />
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-error)] text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <h3 className="font-semibold">{t('notification.title', 'Notifications')}</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                {t('notification.markAllRead', 'Mark all as read')}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-[var(--color-muted)]">
                <div className="mx-auto mb-3 flex justify-center opacity-50">
                  <IconBell size={48} />
                </div>
                <p>{t('notification.empty', 'No notifications yet')}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-4 py-3 text-left hover:bg-[var(--color-secondary)] transition-colors border-b border-[var(--color-border)] last:border-b-0 ${
                    !notification.read ? 'bg-[var(--color-primary)]/5' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${!notification.read ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted)]'}`}>
                          {notification.title.split(' / ')[0]}
                        </p>
                        {!notification.read && (
                          <span className="flex-shrink-0 h-2 w-2 rounded-full bg-[var(--color-primary)]"></span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-muted)] line-clamp-2 mt-0.5">
                        {notification.message.split(' / ')[0]}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-[var(--color-border)] px-4 py-2">
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-sm text-[var(--color-primary)] hover:underline"
              >
                {t('notification.viewAll', 'View all notifications')}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
