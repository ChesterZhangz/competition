import mongoose, { Schema, Document } from 'mongoose';

export interface IDeviceInfo {
  userAgent: string;
  platform?: string;
  browser?: string;
  os?: string;
}

export interface ISessionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  deviceInfo?: IDeviceInfo;
  ipAddress?: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const DeviceInfoSchema = new Schema<IDeviceInfo>(
  {
    userAgent: { type: String, required: true },
    platform: String,
    browser: String,
    os: String,
  },
  { _id: false }
);

const SessionSchema = new Schema<ISessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
    },
    deviceInfo: DeviceInfoSchema,
    ipAddress: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index for automatic cleanup of expired sessions
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model<ISessionDocument>('Session', SessionSchema);
