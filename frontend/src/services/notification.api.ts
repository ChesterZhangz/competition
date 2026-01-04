import { get, post, del } from './api';

export interface Notification {
  _id: string;
  userId: string;
  type: 'teacher_application_submitted' | 'teacher_application_approved' | 'teacher_application_rejected' | 'system';
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  actionUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

interface UnreadCountResponse {
  count: number;
}

interface MarkAllReadResponse {
  markedCount: number;
}

interface DeleteAllResponse {
  deletedCount: number;
}

export const notificationApi = {
  // Get notifications
  getNotifications: (page: number = 1, limit: number = 20, unreadOnly: boolean = false) =>
    get<NotificationsResponse>('/notifications', { page, limit, unreadOnly }),

  // Get unread count
  getUnreadCount: () => get<UnreadCountResponse>('/notifications/unread-count'),

  // Mark notification as read
  markAsRead: (id: string) => post<{ notification: Notification }>(`/notifications/${id}/read`),

  // Mark all as read
  markAllAsRead: () => post<MarkAllReadResponse>('/notifications/mark-all-read'),

  // Delete notification
  deleteNotification: (id: string) => del(`/notifications/${id}`),

  // Delete all notifications
  deleteAllNotifications: () => del<DeleteAllResponse>('/notifications/all'),
};
