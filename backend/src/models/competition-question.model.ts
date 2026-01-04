import mongoose, { Schema, Document } from 'mongoose';
import { IProblemDocument } from './problem.model';

export type QuestionStatus = 'pending' | 'active' | 'revealed' | 'completed';

export interface ICompetitionQuestionDocument extends Document {
  competitionId: mongoose.Types.ObjectId;
  problemId: mongoose.Types.ObjectId;
  order: number;
  timeLimit?: number;
  points?: number;
  status: QuestionStatus;
  revealedAt?: Date;
  createdAt: Date;
}

// Type for populated documents (after .populate('problemId'))
export interface IPopulatedCompetitionQuestion extends Omit<ICompetitionQuestionDocument, 'problemId'> {
  problemId: IProblemDocument;
}

const CompetitionQuestionSchema = new Schema<ICompetitionQuestionDocument>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
      index: true,
    },
    problemId: {
      type: Schema.Types.ObjectId,
      ref: 'Problem',
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    timeLimit: Number,
    points: Number,
    status: {
      type: String,
      enum: ['pending', 'active', 'revealed', 'completed'],
      default: 'pending',
    },
    revealedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound index for ordering
CompetitionQuestionSchema.index({ competitionId: 1, order: 1 });

export const CompetitionQuestion = mongoose.model<ICompetitionQuestionDocument>(
  'CompetitionQuestion',
  CompetitionQuestionSchema
);
