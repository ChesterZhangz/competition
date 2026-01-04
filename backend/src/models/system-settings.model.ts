import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettingsDocument extends Document {
  key: string;
  value: unknown;
  description?: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettingsDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SystemSettingsSchema.index({ key: 1 });

export const SystemSettings = mongoose.model<ISystemSettingsDocument>(
  'SystemSettings',
  SystemSettingsSchema
);

// Predefined setting keys
export const SETTING_KEYS = {
  ALLOWED_EMAIL_DOMAINS: 'allowed_email_domains',
  REGISTRATION_ENABLED: 'registration_enabled',
  REQUIRE_EMAIL_VERIFICATION: 'require_email_verification',
} as const;

// Type for allowed email domains setting
export interface AllowedEmailDomainsValue {
  enabled: boolean;
  domains: string[];
}
