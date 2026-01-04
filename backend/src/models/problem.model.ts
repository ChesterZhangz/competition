import mongoose, { Schema, Document } from 'mongoose';

export type ProblemType =
  | 'single_choice'
  | 'multiple_choice'
  | 'fill_blank'
  | 'integration'
  | 'short_answer'
  | 'proof';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export interface IProblemOption {
  id: string;
  label: string;
  content: string;
}

export interface IProblemDocument extends Document {
  bankId: mongoose.Types.ObjectId;
  type: ProblemType;
  difficulty: DifficultyLevel;
  content: string;
  options?: IProblemOption[];
  correctAnswer: string | string[];
  answerExplanation?: string;
  tags?: mongoose.Types.ObjectId[];
  source?: string;
  estimatedTime?: number;
  points?: number;
  usageCount: number;
  correctRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProblemOptionSchema = new Schema<IProblemOption>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const ProblemSchema = new Schema<IProblemDocument>(
  {
    bankId: {
      type: Schema.Types.ObjectId,
      ref: 'ProblemBank',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['single_choice', 'multiple_choice', 'fill_blank', 'integration', 'short_answer', 'proof'],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'expert'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    options: [ProblemOptionSchema],
    correctAnswer: {
      type: Schema.Types.Mixed,
      required: true,
    },
    answerExplanation: String,
    tags: [{
      type: Schema.Types.ObjectId,
      ref: 'ProblemTag',
    }],
    source: String,
    estimatedTime: Number,
    points: {
      type: Number,
      default: 1,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    correctRate: Number,
  },
  {
    timestamps: true,
  }
);

// Indexes
ProblemSchema.index({ bankId: 1, type: 1 });
ProblemSchema.index({ bankId: 1, difficulty: 1 });
ProblemSchema.index({ content: 'text' });

export const Problem = mongoose.model<IProblemDocument>('Problem', ProblemSchema);
