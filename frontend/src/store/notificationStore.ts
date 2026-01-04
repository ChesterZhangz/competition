import { create } from 'zustand';
import { notificationApi } from '@/services/notification.api';
import type { Notification } from '@/services/notification.api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchNotifications: (page?: number, limit?: number, unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (page = 1, limit = 20, unreadOnly = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notificationApi.getNotifications(page, limit, unreadOnly);
      set({
        notifications: response.notifications,
        total: response.total,
        unreadCount: response.unreadCount,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
        isLoading: false,
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      set({ unreadCount: response.count });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  markAsRead: async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      const { notifications, unreadCount } = get();
      const updatedNotifications = notifications.map((n) =>
        n._id === id ? { ...n, read: true } : n
      );
      const wasUnread = notifications.find((n) => n._id === id && !n.read);
      set({
        notifications: updatedNotifications,
        unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();
      const { notifications } = get();
      const updatedNotifications = notifications.map((n) => ({ ...n, read: true }));
      set({
        notifications: updatedNotifications,
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      const { notifications, unreadCount, total } = get();
      const notification = notifications.find((n) => n._id === id);
      const wasUnread = notification && !notification.read;
      set({
        notifications: notifications.filter((n) => n._id !== id),
        unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
        total: total - 1,
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },

  deleteAllNotifications: async () => {
    try {
      await notificationApi.deleteAllNotifications();
      set({
        notifications: [],
        unreadCount: 0,
        total: 0,
      });
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
    }
  },

  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      total: 0,
      isLoading: false,
      error: null,
    });
  },
}));
