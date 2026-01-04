import mongoose, { Schema, Document } from 'mongoose';

export interface IProblemTagDocument extends Document {
  name: string;
  category?: string;
  color?: string;
  ownerId?: mongoose.Types.ObjectId;
  isGlobal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProblemTagSchema = new Schema<IProblemTagDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    color: {
      type: String,
      match: /^#[0-9A-Fa-f]{6}$/,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique tags per user
ProblemTagSchema.index({ name: 1, ownerId: 1 }, { unique: true });
ProblemTagSchema.index({ category: 1 });
ProblemTagSchema.index({ isGlobal: 1 });

export const ProblemTag = mongoose.model<IProblemTagDocument>('ProblemTag', ProblemTagSchema);
