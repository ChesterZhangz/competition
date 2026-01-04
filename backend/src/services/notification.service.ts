import mongoose from 'mongoose';
import { Notification, INotificationDocument, NotificationType } from '../models/notification.model';
import { User } from '../models/user.model';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
}

export class NotificationService {
  /**
   * Create a notification for a user
   */
  async createNotification(input: CreateNotificationInput): Promise<INotificationDocument> {
    const notification = await Notification.create({
      userId: new mongoose.Types.ObjectId(input.userId),
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
      actionUrl: input.actionUrl,
      read: false,
    });

    return notification;
  }

  /**
   * Create notification for all admins/super_admins
   */
  async notifyAdmins(
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
    actionUrl?: string
  ): Promise<void> {
    const admins = await User.find({
      role: { $in: ['admin', 'super_admin'] },
      status: 'active',
    }).select('_id');

    const notifications = admins.map((admin) => ({
      userId: admin._id,
      type,
      title,
      message,
      data,
      actionUrl,
      read: false,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{ notifications: INotificationDocument[]; total: number; unreadCount: number }> {
    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { notifications: [], total: 0, unreadCount: 0 };
    }

    const query: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };
    if (unreadOnly) {
      query.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        read: false,
      }),
    ]);

    return { notifications, total, unreadCount };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return 0;
    }
    return Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      read: false,
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<INotificationDocument | null> {
    return Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      { read: true },
      { new: true }
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        read: false,
      },
      { read: true }
    );

    return result.modifiedCount;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await Notification.deleteOne({
      _id: new mongoose.Types.ObjectId(notificationId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    return result.deletedCount > 0;
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string): Promise<number> {
    const result = await Notification.deleteMany({
      userId: new mongoose.Types.ObjectId(userId),
    });

    return result.deletedCount;
  }

  /**
   * Notify competition host when a participant joins
   */
  async notifyParticipantJoined(
    hostUserId: string,
    competitionId: string,
    competitionName: string,
    participantNickname: string,
    participantCount: number
  ): Promise<void> {
    await this.createNotification({
      userId: hostUserId,
      type: 'competition_participant_joined',
      title: '新参与者加入 / New Participant Joined',
      message: `${participantNickname} 加入了比赛「${competitionName}」（当前 ${participantCount} 人） / ${participantNickname} joined "${competitionName}" (${participantCount} participants now)`,
      data: { competitionId, participantNickname, participantCount },
      actionUrl: `/competitions/${competitionId}/host`,
    });
  }

  /**
   * Notify all participants when competition starts
   */
  async notifyCompetitionStarted(
    participantUserIds: string[],
    competitionId: string,
    competitionName: string
  ): Promise<void> {
    if (participantUserIds.length === 0) return;

    const notifications = participantUserIds.map((userId) => ({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'competition_started' as NotificationType,
      title: '比赛开始 / Competition Started',
      message: `比赛「${competitionName}」已开始！ / Competition "${competitionName}" has started!`,
      data: { competitionId, competitionName },
      actionUrl: `/competitions/${competitionId}/play`,
      read: false,
    }));

    await Notification.insertMany(notifications);
  }

  /**
   * Notify all participants when competition ends with their results
   */
  async notifyCompetitionEnded(
    results: Array<{
      userId: string;
      rank: number;
      totalScore: number;
      correctCount: number;
      totalQuestions: number;
    }>,
    competitionId: string,
    competitionName: string
  ): Promise<void> {
    if (results.length === 0) return;

    const notifications = results.map((result) => {
      const rankEmoji = result.rank === 1 ? '🥇' : result.rank === 2 ? '🥈' : result.rank === 3 ? '🥉' : '🏅';
      const rankText = result.rank <= 3 ? rankEmoji : `第${result.rank}名`;
      const rankTextEn = result.rank <= 3 ? rankEmoji : `#${result.rank}`;

      return {
        userId: new mongoose.Types.ObjectId(result.userId),
        type: 'competition_result' as NotificationType,
        title: '比赛结束 / Competition Ended',
        message: `比赛「${competitionName}」已结束！您获得${rankText}，得分 ${result.totalScore}，答对 ${result.correctCount}/${result.totalQuestions} 题。 / "${competitionName}" ended! You placed ${rankTextEn} with ${result.totalScore} points, ${result.correctCount}/${result.totalQuestions} correct.`,
        data: {
          competitionId,
          competitionName,
          rank: result.rank,
          totalScore: result.totalScore,
          correctCount: result.correctCount,
          totalQuestions: result.totalQuestions,
        },
        actionUrl: `/competitions/${competitionId}/results`,
        read: false,
      };
    });

    await Notification.insertMany(notifications);
  }

  /**
   * Notify multiple users at once
   */
  async notifyMultipleUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
    actionUrl?: string
  ): Promise<void> {
    if (userIds.length === 0) return;

    const notifications = userIds.map((userId) => ({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      title,
      message,
      data,
      actionUrl,
      read: false,
    }));

    await Notification.insertMany(notifications);
  }
}

export const notificationService = new NotificationService();
