import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'teacher_application_submitted'  // 教师申请已提交（管理员收到）
  | 'teacher_application_approved'   // 教师申请已通过（申请人收到）
  | 'teacher_application_rejected'   // 教师申请已拒绝（申请人收到）
  | 'competition_participant_joined' // 有参与者加入比赛（主持人收到）
  | 'competition_started'            // 比赛开始（参与者收到）
  | 'competition_ended'              // 比赛结束（参与者收到）
  | 'competition_result'             // 比赛结果通知（参与者收到，包含排名）
  | 'system';                         // 系统通知

export interface INotificationDocument extends Document {
  userId: mongoose.Types.ObjectId;           // 接收通知的用户
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;             // 额外数据（如申请ID等）
  actionUrl?: string;                         // 点击通知后跳转的URL
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'teacher_application_submitted',
        'teacher_application_approved',
        'teacher_application_rejected',
        'competition_participant_joined',
        'competition_started',
        'competition_ended',
        'competition_result',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    read: {
      type: Boolean,
      default: false,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    actionUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotificationDocument>(
  'Notification',
  NotificationSchema
);
