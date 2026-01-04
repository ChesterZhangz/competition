import mongoose, { Schema, Document } from 'mongoose';

export type ParticipantRole = 'viewer' | 'submitter' | 'both';

export interface ICompetitionParticipantDocument extends Document {
  competitionId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;          // 所属团队
  nickname: string;
  avatar?: string;
  role: ParticipantRole;                      // 在团队中的角色
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  rank?: number;
  socketId?: string;
  isOnline: boolean;
  joinedAt: Date;
  lastActiveAt: Date;
}

const CompetitionParticipantSchema = new Schema<ICompetitionParticipantDocument>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'CompetitionTeam',
      index: true,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    avatar: String,
    role: {
      type: String,
      enum: ['viewer', 'submitter', 'both'],
      default: 'both',
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    wrongCount: {
      type: Number,
      default: 0,
    },
    rank: Number,
    socketId: String,
    isOnline: {
      type: Boolean,
      default: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CompetitionParticipantSchema.index({ competitionId: 1, totalScore: -1 });
CompetitionParticipantSchema.index({ competitionId: 1, nickname: 1 });
CompetitionParticipantSchema.index({ socketId: 1 });

export const CompetitionParticipant = mongoose.model<ICompetitionParticipantDocument>(
  'CompetitionParticipant',
  CompetitionParticipantSchema
);
