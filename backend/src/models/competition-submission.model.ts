import mongoose, { Schema, Document } from 'mongoose';

// 裁判覆盖记录
export interface IRefereeOverride {
  overriddenBy: mongoose.Types.ObjectId;  // 裁判用户ID
  originalScore: number;
  newScore: number;
  comment?: string;
  overriddenAt: Date;
}

export interface ICompetitionSubmissionDocument extends Document {
  competitionId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  participantId: mongoose.Types.ObjectId;
  answer: string | string[];
  isCorrect: boolean;
  points: number;
  timeSpent: number;
  timeBonus: number;
  submittedAt: Date;
  refereeOverride?: IRefereeOverride;  // 裁判覆盖记录
}

const CompetitionSubmissionSchema = new Schema<ICompetitionSubmissionDocument>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'CompetitionQuestion',
      required: true,
    },
    participantId: {
      type: Schema.Types.ObjectId,
      ref: 'CompetitionParticipant',
      required: true,
    },
    answer: {
      type: Schema.Types.Mixed,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    timeSpent: {
      type: Number,
      required: true,
    },
    timeBonus: {
      type: Number,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    refereeOverride: {
      overriddenBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      originalScore: Number,
      newScore: Number,
      comment: String,
      overriddenAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CompetitionSubmissionSchema.index({ competitionId: 1, questionId: 1, participantId: 1 }, { unique: true });
CompetitionSubmissionSchema.index({ participantId: 1 });

export const CompetitionSubmission = mongoose.model<ICompetitionSubmissionDocument>(
  'CompetitionSubmission',
  CompetitionSubmissionSchema
);
