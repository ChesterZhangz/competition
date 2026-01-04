import mongoose, { Schema, Document } from 'mongoose';

export interface IProblemBankDocument extends Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  visibility: 'private' | 'public' | 'shared';
  sharedWith?: mongoose.Types.ObjectId[];
  tags?: string[];
  problemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProblemBankSchema = new Schema<IProblemBankDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['private', 'public', 'shared'],
      default: 'private',
    },
    sharedWith: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    tags: [{
      type: String,
      trim: true,
    }],
    problemCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProblemBankSchema.index({ name: 'text', description: 'text' });
ProblemBankSchema.index({ visibility: 1 });
ProblemBankSchema.index({ ownerId: 1, visibility: 1 });

export const ProblemBank = mongoose.model<IProblemBankDocument>('ProblemBank', ProblemBankSchema);
