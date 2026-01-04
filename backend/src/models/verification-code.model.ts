import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationCodeDocument extends Document {
  target: string;
  targetType: 'email' | 'phone';
  code: string;
  purpose: 'register' | 'login' | 'reset_password' | 'bind';
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
}

const VerificationCodeSchema = new Schema<IVerificationCodeDocument>(
  {
    target: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['email', 'phone'],
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['register', 'login', 'reset_password', 'bind'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for looking up codes
VerificationCodeSchema.index({ target: 1, purpose: 1, verified: 1 });

// TTL index for automatic cleanup
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationCode = mongoose.model<IVerificationCodeDocument>(
  'VerificationCode',
  VerificationCodeSchema
);
