import mongoose, { Schema, Document } from 'mongoose';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface ITeacherApplicationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  reason: string;
  status: ApplicationStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherApplicationSchema = new Schema<ITeacherApplicationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewNote: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
TeacherApplicationSchema.index({ userId: 1, status: 1 });
TeacherApplicationSchema.index({ status: 1, createdAt: -1 });

export const TeacherApplication = mongoose.model<ITeacherApplicationDocument>(
  'TeacherApplication',
  TeacherApplicationSchema
);
