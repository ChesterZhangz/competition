import mongoose, { Schema, Document } from 'mongoose';

export type TeamRole = 'viewer' | 'submitter' | 'both';

export interface ITeamMember {
  participantId: mongoose.Types.ObjectId;
  role: TeamRole;
  joinedAt: Date;
}

export interface ICompetitionTeamDocument extends Document {
  competitionId: mongoose.Types.ObjectId;
  name: string;
  color: string;
  captainId: mongoose.Types.ObjectId;       // 队长参与者ID
  members: ITeamMember[];
  maxSize: number;
  totalScore: number;
  averageScore: number;
  correctCount: number;
  wrongCount: number;
  rank?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    participantId: {
      type: Schema.Types.ObjectId,
      ref: 'CompetitionParticipant',
      required: true,
    },
    role: {
      type: String,
      enum: ['viewer', 'submitter', 'both'],
      default: 'both',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const CompetitionTeamSchema = new Schema<ICompetitionTeamDocument>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    color: {
      type: String,
      required: true,
      default: '#2cb1bc',
    },
    captainId: {
      type: Schema.Types.ObjectId,
      ref: 'CompetitionParticipant',
      required: true,
    },
    members: {
      type: [TeamMemberSchema],
      default: [],
    },
    maxSize: {
      type: Number,
      default: 4,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    averageScore: {
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CompetitionTeamSchema.index({ competitionId: 1, totalScore: -1 });
CompetitionTeamSchema.index({ competitionId: 1, name: 1 });
CompetitionTeamSchema.index({ 'members.participantId': 1 });

// Virtual for member count
CompetitionTeamSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

// Method to check if team is full
CompetitionTeamSchema.methods.isFull = function () {
  return this.members.length >= this.maxSize;
};

// Method to add a member
CompetitionTeamSchema.methods.addMember = function (
  participantId: mongoose.Types.ObjectId,
  role: TeamRole = 'both'
) {
  if (this.isFull()) {
    throw new Error('Team is full');
  }
  if (this.members.some((m: ITeamMember) => m.participantId.equals(participantId))) {
    throw new Error('Already a member');
  }
  this.members.push({
    participantId,
    role,
    joinedAt: new Date(),
  });
  return this.save();
};

// Method to remove a member
CompetitionTeamSchema.methods.removeMember = function (participantId: mongoose.Types.ObjectId) {
  const index = this.members.findIndex((m: ITeamMember) => m.participantId.equals(participantId));
  if (index === -1) {
    throw new Error('Not a member');
  }
  this.members.splice(index, 1);
  return this.save();
};

// Method to update average score
CompetitionTeamSchema.methods.updateAverageScore = function () {
  if (this.members.length > 0) {
    this.averageScore = this.totalScore / this.members.length;
  } else {
    this.averageScore = 0;
  }
  return this.save();
};

export const CompetitionTeam = mongoose.model<ICompetitionTeamDocument>(
  'CompetitionTeam',
  CompetitionTeamSchema
);
