import mongoose, { Schema, Document } from 'mongoose';

export type CompetitionType = 'integration_bee' | 'fun_math' | 'quiz' | 'speed_math';
export type CompetitionMode = 'onsite' | 'online';
export type CompetitionStatus = 'draft' | 'ready' | 'ongoing' | 'paused' | 'finished';
export type CompetitionPhase =
  | 'setup'           // 设置阶段
  | 'team-formation'  // 组队阶段
  | 'waiting'         // 等待开始
  | 'countdown'       // 倒计时
  | 'question'        // 答题中
  | 'revealing'       // 揭晓答案
  | 'leaderboard'     // 排行榜展示
  | 'finished';       // 已结束
export type ParticipantMode = 'individual' | 'team';
export type TeamRoleMode = 'all_equal' | 'single_submit' | 'split_view';

export interface ITeamSettings {
  enabled: boolean;
  teamSize: number;           // 最大团队人数
  minTeamSize: number;        // 最小团队人数
  allowTeamFormation: boolean; // 允许参与者自行组队
  roleMode: TeamRoleMode;     // 角色模式
}

export interface IRefereeSettings {
  enabled: boolean;
  maxReferees: number;
  permissions: RefereePermission[];  // 裁判拥有的权限
}

// 裁判权限
export type RefereePermission =
  | 'override_score'      // 覆盖分数
  | 'manual_judge'        // 手动判分
  | 'add_comment'         // 添加评论
  | 'pause_competition'   // 暂停比赛
  | 'skip_question'       // 跳过题目
  | 'extend_time';        // 延长时间

// 裁判信息
export interface IReferee {
  odId?: mongoose.Types.ObjectId;  // 内部ID
  userId: mongoose.Types.ObjectId;
  email: string;
  nickname?: string;
  addedAt: Date;
  isOnline: boolean;
  socketId?: string;
}

export interface ITimerState {
  questionStartTime?: Date;
  pausedAt?: Date;
  remainingTime: number;      // 剩余时间（毫秒）
  isRunning: boolean;
}

export interface ICompetitionSettings {
  questionTimeLimit: number;
  totalTimeLimit?: number;
  basePoints: number;
  timeBonus: boolean;
  timeBonusMultiplier?: number;
  penaltyForWrong: boolean;
  penaltyPoints?: number;
  showLeaderboard: boolean;
  showCorrectAnswer: boolean;
  showAnswerAfterTime: boolean;
  maxParticipants?: number;
  allowLateJoin: boolean;
  requireNickname: boolean;
  questionsPerPage: number;          // 每页显示题目数量
  layout: 'single' | 'grid' | 'list'; // 题目布局
  teamSettings: ITeamSettings;
  refereeSettings: IRefereeSettings;
}

export interface ICompetitionDocument extends Document {
  name: string;
  description?: string;
  type: CompetitionType;
  mode: CompetitionMode;
  hostId: mongoose.Types.ObjectId;
  joinCode: string;
  settings: ICompetitionSettings;
  status: CompetitionStatus;
  currentPhase: CompetitionPhase;
  participantMode: ParticipantMode;
  currentQuestionIndex: number;
  timerState: ITimerState;
  questionCount: number;        // 总题目数
  referees: IReferee[];         // 裁判列表
  scheduledStartTime?: Date;
  actualStartTime?: Date;
  endTime?: Date;
  participantCount: number;
  teamCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSettingsSchema = new Schema<ITeamSettings>(
  {
    enabled: { type: Boolean, default: false },
    teamSize: { type: Number, default: 4 },
    minTeamSize: { type: Number, default: 2 },
    allowTeamFormation: { type: Boolean, default: true },
    roleMode: {
      type: String,
      enum: ['all_equal', 'single_submit', 'split_view'],
      default: 'all_equal',
    },
  },
  { _id: false }
);

const RefereeSettingsSchema = new Schema<IRefereeSettings>(
  {
    enabled: { type: Boolean, default: false },
    maxReferees: { type: Number, default: 3 },
    permissions: {
      type: [String],
      enum: ['override_score', 'manual_judge', 'add_comment', 'pause_competition', 'skip_question', 'extend_time'],
      default: ['manual_judge', 'add_comment', 'extend_time'],
    },
  },
  { _id: false }
);

const RefereeSchema = new Schema<IReferee>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    nickname: String,
    addedAt: {
      type: Date,
      default: Date.now,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    socketId: String,
  },
  { _id: true }
);

const TimerStateSchema = new Schema<ITimerState>(
  {
    questionStartTime: Date,
    pausedAt: Date,
    remainingTime: { type: Number, default: 0 },
    isRunning: { type: Boolean, default: false },
  },
  { _id: false }
);

const CompetitionSettingsSchema = new Schema<ICompetitionSettings>(
  {
    questionTimeLimit: { type: Number, default: 60 },
    totalTimeLimit: Number,
    basePoints: { type: Number, default: 100 },
    timeBonus: { type: Boolean, default: true },
    timeBonusMultiplier: { type: Number, default: 0.5 },
    penaltyForWrong: { type: Boolean, default: false },
    penaltyPoints: { type: Number, default: 0 },
    showLeaderboard: { type: Boolean, default: true },
    showCorrectAnswer: { type: Boolean, default: true },
    showAnswerAfterTime: { type: Boolean, default: true },
    maxParticipants: Number,
    allowLateJoin: { type: Boolean, default: true },
    requireNickname: { type: Boolean, default: true },
    questionsPerPage: { type: Number, default: 1 },
    layout: {
      type: String,
      enum: ['single', 'grid', 'list'],
      default: 'single',
    },
    teamSettings: {
      type: TeamSettingsSchema,
      default: () => ({}),
    },
    refereeSettings: {
      type: RefereeSettingsSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const CompetitionSchema = new Schema<ICompetitionDocument>(
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
    type: {
      type: String,
      enum: ['integration_bee', 'fun_math', 'quiz', 'speed_math'],
      required: true,
    },
    mode: {
      type: String,
      enum: ['onsite', 'online'],
      required: true,
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      length: 6,
    },
    settings: {
      type: CompetitionSettingsSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['draft', 'ready', 'ongoing', 'paused', 'finished'],
      default: 'draft',
    },
    currentPhase: {
      type: String,
      enum: ['setup', 'team-formation', 'waiting', 'countdown', 'question', 'revealing', 'leaderboard', 'finished'],
      default: 'setup',
    },
    participantMode: {
      type: String,
      enum: ['individual', 'team'],
      default: 'individual',
    },
    currentQuestionIndex: {
      type: Number,
      default: -1,
    },
    timerState: {
      type: TimerStateSchema,
      default: () => ({ remainingTime: 0, isRunning: false }),
    },
    questionCount: {
      type: Number,
      default: 0,
    },
    referees: {
      type: [RefereeSchema],
      default: [],
    },
    scheduledStartTime: Date,
    actualStartTime: Date,
    endTime: Date,
    participantCount: {
      type: Number,
      default: 0,
    },
    teamCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CompetitionSchema.index({ joinCode: 1 }, { unique: true });
CompetitionSchema.index({ hostId: 1, status: 1 });
CompetitionSchema.index({ status: 1 });

export const Competition = mongoose.model<ICompetitionDocument>('Competition', CompetitionSchema);
