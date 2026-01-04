import mongoose, { FlattenMaps } from 'mongoose';
import crypto from 'crypto';
import { Competition, ICompetitionDocument, CompetitionStatus, IReferee, RefereePermission } from '../models/competition.model';
import { CompetitionQuestion, ICompetitionQuestionDocument, IPopulatedCompetitionQuestion } from '../models/competition-question.model';
import { CompetitionParticipant, ICompetitionParticipantDocument } from '../models/competition-participant.model';
import { CompetitionSubmission } from '../models/competition-submission.model';
import { Problem, IProblemDocument } from '../models/problem.model';
import { User } from '../models/user.model';
import { redisHelpers } from '../config/redis';
import type { CreateCompetitionInput, UpdateCompetitionInput, AddQuestionsInput } from '../validators/competition.validator';

// Type for lean documents (POJO without Mongoose methods)
type LeanCompetition = FlattenMaps<ICompetitionDocument> & { _id: mongoose.Types.ObjectId };

// Maximum retries for join code generation to prevent infinite loop
const MAX_JOIN_CODE_RETRIES = 10;

// Use cryptographically secure random number generator for join codes
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return code;
}

export class CompetitionService {
  // Helper to check if user is authorized as host (owner or admin/super_admin)
  private isAuthorizedAsHost(
    competition: ICompetitionDocument,
    userId: string,
    userRole?: string
  ): boolean {
    const isOwner = competition.hostId.toString() === userId;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    return isOwner || isAdmin;
  }

  // Create a new competition
  async create(input: CreateCompetitionInput, hostId: string): Promise<ICompetitionDocument> {
    let joinCode = generateJoinCode();
    let retries = 0;

    // Ensure unique join code with retry limit to prevent infinite loop
    while (await Competition.exists({ joinCode })) {
      retries++;
      if (retries >= MAX_JOIN_CODE_RETRIES) {
        throw new Error('Failed to generate unique join code. Please try again.');
      }
      joinCode = generateJoinCode();
    }

    const competition = await Competition.create({
      ...input,
      hostId: new mongoose.Types.ObjectId(hostId),
      joinCode,
      settings: {
        questionTimeLimit: 60,
        basePoints: 100,
        timeBonus: true,
        timeBonusMultiplier: 0.5,
        penaltyForWrong: false,
        penaltyPoints: 0,
        showLeaderboard: true,
        showCorrectAnswer: true,
        showAnswerAfterTime: true,
        allowLateJoin: true,
        requireNickname: true,
        ...input.settings,
        // Include refereeSettings if provided
        ...(input.refereeSettings && {
          refereeSettings: {
            enabled: input.refereeSettings.enabled || false,
            maxReferees: input.refereeSettings.maxReferees || 3,
            permissions: input.refereeSettings.permissions || [],
          },
        }),
      },
    });

    return competition;
  }

  // Get competition by ID
  async getById(competitionId: string): Promise<ICompetitionDocument | null> {
    return Competition.findById(competitionId).populate('hostId', 'nickname avatar');
  }

  // Get competition by join code
  async getByJoinCode(joinCode: string): Promise<ICompetitionDocument | null> {
    return Competition.findOne({ joinCode: joinCode.toUpperCase() });
  }

  // List competitions for a host
  async listByHost(
    hostId: string,
    options: { page?: number; limit?: number; status?: CompetitionStatus } = {}
  ): Promise<{ items: LeanCompetition[]; total: number }> {
    const { page = 1, limit = 20, status } = options;
    const skip = (page - 1) * limit;

    const query: mongoose.FilterQuery<ICompetitionDocument> = {
      hostId: new mongoose.Types.ObjectId(hostId),
    };

    if (status) {
      query.status = status;
    }

    const [items, total] = await Promise.all([
      Competition.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<LeanCompetition[]>(),
      Competition.countDocuments(query),
    ]);

    return { items, total };
  }

  // Update competition
  async update(
    competitionId: string,
    input: UpdateCompetitionInput,
    hostId: string,
    userRole?: string
  ): Promise<ICompetitionDocument | null> {
    const competition = await Competition.findById(competitionId);
    if (!competition) return null;

    if (!this.isAuthorizedAsHost(competition, hostId, userRole)) {
      throw new Error('Not authorized to update this competition');
    }

    if (competition.status !== 'draft') {
      throw new Error('Can only update competitions in draft status');
    }

    Object.assign(competition, input);
    await competition.save();
    return competition;
  }

  // Delete competition
  async delete(competitionId: string, hostId: string, userRole?: string): Promise<boolean> {
    const competition = await Competition.findById(competitionId);
    if (!competition) return false;

    if (!this.isAuthorizedAsHost(competition, hostId, userRole)) {
      throw new Error('Not authorized to delete this competition');
    }

    // Delete related data
    await Promise.all([
      CompetitionQuestion.deleteMany({ competitionId: new mongoose.Types.ObjectId(competitionId) }),
      CompetitionParticipant.deleteMany({ competitionId: new mongoose.Types.ObjectId(competitionId) }),
      CompetitionSubmission.deleteMany({ competitionId: new mongoose.Types.ObjectId(competitionId) }),
    ]);

    await Competition.deleteOne({ _id: competitionId });
    return true;
  }

  // Add questions to competition
  async addQuestions(
    competitionId: string,
    input: AddQuestionsInput,
    hostId: string,
    userRole?: string
  ): Promise<ICompetitionQuestionDocument[]> {
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (!this.isAuthorizedAsHost(competition, hostId, userRole)) {
      throw new Error('Not authorized to modify this competition');
    }

    // Get current max order
    const lastQuestion = await CompetitionQuestion.findOne({ competitionId: new mongoose.Types.ObjectId(competitionId) })
      .sort({ order: -1 });
    let order = lastQuestion ? lastQuestion.order + 1 : 0;

    const questions: ICompetitionQuestionDocument[] = [];
    for (const q of input.questions) {
      const problem = await Problem.findById(q.problemId);
      if (!problem) {
        throw new Error(`Problem ${q.problemId} not found`);
      }

      const question = await CompetitionQuestion.create({
        competitionId: new mongoose.Types.ObjectId(competitionId),
        problemId: new mongoose.Types.ObjectId(q.problemId),
        order: order++,
        timeLimit: q.timeLimit,
        points: q.points,
        status: 'pending',
      });
      questions.push(question);
    }

    return questions;
  }

  // Get competition questions (with populated problemId)
  async getQuestions(competitionId: string): Promise<IPopulatedCompetitionQuestion[]> {
    return CompetitionQuestion.find({ competitionId: new mongoose.Types.ObjectId(competitionId) })
      .populate<{ problemId: IProblemDocument }>('problemId')
      .sort({ order: 1 }) as unknown as Promise<IPopulatedCompetitionQuestion[]>;
  }

  // Remove question from competition
  async removeQuestion(questionId: string, hostId: string, userRole?: string): Promise<boolean> {
    const question = await CompetitionQuestion.findById(questionId).populate('competitionId');
    if (!question) return false;

    const competition = await Competition.findById(question.competitionId);
    if (!competition || !this.isAuthorizedAsHost(competition, hostId, userRole)) {
      throw new Error('Not authorized');
    }

    await CompetitionQuestion.deleteOne({ _id: questionId });
    return true;
  }

  // Join competition
  async join(
    joinCode: string,
    nickname: string,
    userId?: string,
    socketId?: string
  ): Promise<{ competition: ICompetitionDocument; participant: ICompetitionParticipantDocument }> {
    const competition = await this.getByJoinCode(joinCode);
    if (!competition) {
      throw new Error('Invalid join code');
    }

    if (competition.status === 'finished') {
      throw new Error('Competition has ended');
    }

    if (competition.status === 'ongoing' && !competition.settings.allowLateJoin) {
      throw new Error('Late joining is not allowed');
    }

    if (competition.settings.maxParticipants &&
        competition.participantCount >= competition.settings.maxParticipants) {
      throw new Error('Competition is full');
    }

    // Check if already joined
    const existingParticipant = await CompetitionParticipant.findOne({
      competitionId: competition._id,
      $or: [
        ...(userId ? [{ userId: new mongoose.Types.ObjectId(userId) }] : []),
        { nickname },
      ],
    });

    if (existingParticipant) {
      // Update socket ID and online status
      existingParticipant.socketId = socketId;
      existingParticipant.isOnline = true;
      existingParticipant.lastActiveAt = new Date();
      await existingParticipant.save();
      return { competition, participant: existingParticipant };
    }

    // Create new participant
    const participant = await CompetitionParticipant.create({
      competitionId: competition._id,
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      nickname,
      socketId,
      isOnline: true,
    });

    // Update participant count
    await Competition.updateOne(
      { _id: competition._id },
      { $inc: { participantCount: 1 } }
    );

    return { competition, participant };
  }

  // Leave competition (update online status)
  async leave(participantId: string): Promise<void> {
    await CompetitionParticipant.updateOne(
      { _id: participantId },
      { isOnline: false, socketId: null }
    );
  }

  // Start competition
  async start(competitionId: string, hostId: string, userRole?: string): Promise<ICompetitionDocument> {
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (!this.isAuthorizedAsHost(competition, hostId, userRole)) {
      throw new Error('Not authorized');
    }

    if (competition.status !== 'draft' && competition.status !== 'ready') {
      throw new Error('Competition cannot be started');
    }

    competition.status = 'ongoing';
    competition.actualStartTime = new Date();
    competition.currentQuestionIndex = -1;
    await competition.save();

    // Store state in Redis
    await redisHelpers.setCompetitionState(competitionId, {
      status: 'ongoing',
      currentQuestionIndex: -1,
      startTime: Date.now(),
    });

    return competition;
  }

  // Pause competition
  async pause(competitionId: string, hostId: string, userRole?: string): Promise<ICompetitionDocument> {
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (!this.isAuthorizedAsHost(competition, hostId, userRole)) {
      throw new Error('Not authorized');
    }

    if (competition.status !== 'ongoing') {
      throw new Error('Competition is not ongoing');
    }

    competition.status = 'paused';
    await competition.save();

    await redisHelpers.setCompetitionState(competitionId, {
      status: 'paused',
      currentQuestionIndex: competition.currentQuestionIndex,
    });

    return competition;
  }

  // Resume competition
  async resume(competitionId: string, hostId: string, userRole?: string): Promise<ICompetitionDocument> {
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (!this.isAuthorizedAsHost(competition, hostId, userRole)) {
      throw new Error('Not authorized');
    }

    if (competition.status !== 'paused') {
      throw new Error('Competition is not paused');
    }

    competition.status = 'ongoing';
    await competition.save();

    await redisHelpers.setCompetitionState(competitionId, {
      status: 'ongoing',
      currentQuestionIndex: competition.currentQuestionIndex,
    });

    return competition;
  }

  // End competition
  async end(competitionId: string, hostId: string, userRole?: string): Promise<ICompetitionDocument> {
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (!this.isAuthorizedAsHost(competition, hostId, userRole)) {
      throw new Error('Not authorized');
    }

    competition.status = 'finished';
    competition.endTime = new Date();
    await competition.save();

    // Update final rankings
    await this.updateRankings(competitionId);

    return competition;
  }

  // Next question (with populated problemId)
  async nextQuestion(competitionId: string, hostId: string, userRole?: string): Promise<IPopulatedCompetitionQuestion | null> {
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (!this.isAuthorizedAsHost(competition, hostId, userRole)) {
      throw new Error('Not authorized');
    }

    if (competition.status !== 'ongoing') {
      throw new Error('Competition is not ongoing');
    }

    // Mark current question as completed
    if (competition.currentQuestionIndex >= 0) {
      await CompetitionQuestion.updateOne(
        {
          competitionId: new mongoose.Types.ObjectId(competitionId),
          order: competition.currentQuestionIndex,
        },
        { status: 'completed' }
      );
    }

    // Get next question
    const nextIndex = competition.currentQuestionIndex + 1;
    const nextQuestion = await CompetitionQuestion.findOne({
      competitionId: new mongoose.Types.ObjectId(competitionId),
      order: nextIndex,
    }).populate<{ problemId: IProblemDocument }>('problemId') as IPopulatedCompetitionQuestion | null;

    if (!nextQuestion) {
      return null; // No more questions
    }

    // Update competition
    competition.currentQuestionIndex = nextIndex;
    await competition.save();

    // Update question status
    nextQuestion.status = 'active';
    await nextQuestion.save();

    return nextQuestion;
  }

  // Reveal answer
  async revealAnswer(competitionId: string, questionId: string, hostId: string, userRole?: string): Promise<void> {
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (!this.isAuthorizedAsHost(competition, hostId, userRole)) {
      throw new Error('Not authorized');
    }

    await CompetitionQuestion.updateOne(
      { _id: questionId },
      { status: 'revealed', revealedAt: new Date() }
    );
  }

  // Submit answer with atomic operation to prevent race conditions
  async submitAnswer(
    competitionId: string,
    questionId: string,
    participantId: string,
    answer: string | string[],
    timeSpent: number
  ): Promise<{ isCorrect: boolean; points: number }> {
    const competition = await Competition.findById(competitionId);
    if (!competition || competition.status !== 'ongoing') {
      throw new Error('Competition is not active');
    }

    const question = await CompetitionQuestion.findById(questionId).populate<{ problemId: IProblemDocument }>('problemId');
    if (!question || question.status !== 'active') {
      throw new Error('Question is not active');
    }

    // Use findOneAndUpdate with upsert to atomically check and create submission
    // This prevents race conditions where two submissions could pass the check
    const existingSubmission = await CompetitionSubmission.findOne({
      questionId: new mongoose.Types.ObjectId(questionId),
      participantId: new mongoose.Types.ObjectId(participantId),
    });

    if (existingSubmission) {
      throw new Error('Already submitted');
    }

    // Check answer with proper typing
    const problem = question.problemId as IProblemDocument;
    if (!problem) {
      throw new Error('Problem not found');
    }

    let isCorrect = false;

    if (Array.isArray(problem.correctAnswer)) {
      if (Array.isArray(answer)) {
        isCorrect = answer.length === problem.correctAnswer.length &&
          answer.every((a: string) => problem.correctAnswer.includes(a));
      }
    } else {
      isCorrect = answer === problem.correctAnswer;
    }

    // Calculate points
    let points = 0;
    let timeBonus = 0;
    const basePoints = question.points || competition.settings.basePoints;
    // timeSpent is already in ms, timeLimit is in seconds
    const timeLimitMs = (question.timeLimit || competition.settings.questionTimeLimit) * 1000;

    if (isCorrect) {
      points = basePoints;

      if (competition.settings.timeBonus && timeSpent < timeLimitMs) {
        const multiplier = competition.settings.timeBonusMultiplier || 0.5;
        const timeRatio = 1 - (timeSpent / timeLimitMs);
        timeBonus = Math.round(basePoints * multiplier * timeRatio);
        points += timeBonus;
      }
    } else if (competition.settings.penaltyForWrong) {
      points = -(competition.settings.penaltyPoints || 0);
    }

    // Create submission atomically using findOneAndUpdate with upsert
    // This ensures only one submission can be created per participant per question
    try {
      await CompetitionSubmission.create({
        competitionId: new mongoose.Types.ObjectId(competitionId),
        questionId: new mongoose.Types.ObjectId(questionId),
        participantId: new mongoose.Types.ObjectId(participantId),
        answer,
        isCorrect,
        points,
        timeSpent,
        timeBonus,
      });
    } catch (error: unknown) {
      // Check for duplicate key error (unique index violation)
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        throw new Error('Already submitted');
      }
      throw error;
    }

    // Update participant score with atomic operation
    const updateFields: Record<string, number> = { totalScore: points };
    if (isCorrect) {
      updateFields.correctCount = 1;
    } else {
      updateFields.wrongCount = 1;
    }

    await CompetitionParticipant.updateOne(
      { _id: participantId },
      { $inc: updateFields }
    );

    // Update leaderboard in Redis
    const participant = await CompetitionParticipant.findById(participantId);
    if (participant) {
      await redisHelpers.updateLeaderboard(
        competitionId,
        participantId,
        participant.totalScore
      );
    }

    return { isCorrect, points };
  }

  // Get leaderboard
  async getLeaderboard(competitionId: string, limit = 10): Promise<ICompetitionParticipantDocument[]> {
    return CompetitionParticipant.find({
      competitionId: new mongoose.Types.ObjectId(competitionId),
    })
      .sort({ totalScore: -1, correctCount: -1, lastActiveAt: 1 })
      .limit(limit);
  }

  // Update rankings using bulkWrite to avoid N+1 database operations
  async updateRankings(competitionId: string): Promise<void> {
    const participants = await CompetitionParticipant.find({
      competitionId: new mongoose.Types.ObjectId(competitionId),
    }).sort({ totalScore: -1, correctCount: -1 });

    if (participants.length === 0) return;

    // Use bulkWrite for efficient batch updates
    const bulkOps = participants.map((participant, index) => ({
      updateOne: {
        filter: { _id: participant._id },
        update: { $set: { rank: index + 1 } },
      },
    }));

    await CompetitionParticipant.bulkWrite(bulkOps);
  }

  // Get participant by socket ID
  async getParticipantBySocketId(socketId: string): Promise<ICompetitionParticipantDocument | null> {
    return CompetitionParticipant.findOne({ socketId });
  }

  // ========== REFEREE MANAGEMENT ==========

  // Add referee to competition by email
  async addReferee(
    competitionId: string,
    email: string,
    hostId: string,
    userRole?: string
  ): Promise<IReferee> {
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (!this.isAuthorizedAsHost(competition, hostId, userRole)) {
      throw new Error('Not authorized to add referees');
    }

    if (!competition.settings.refereeSettings?.enabled) {
      throw new Error('Referee feature is not enabled for this competition');
    }

    // Check max referees limit
    const maxReferees = competition.settings.refereeSettings.maxReferees || 3;
    if (competition.referees.length >= maxReferees) {
      throw new Error(`Maximum number of referees (${maxReferees}) reached`);
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('User not found with this email');
    }

    // Check if already a referee
    const existingReferee = competition.referees.find(
      (r) => r.userId.toString() === user._id.toString()
    );
    if (existingReferee) {
      throw new Error('User is already a referee for this competition');
    }

    // Check if user is the host
    if (competition.hostId.toString() === user._id.toString()) {
      throw new Error('Host cannot be added as a referee');
    }

    const referee: IReferee = {
      userId: user._id as mongoose.Types.ObjectId,
      email: user.email || email.toLowerCase(),
      nickname: user.nickname,
      addedAt: new Date(),
      isOnline: false,
    };

    competition.referees.push(referee);
    await competition.save();

    return referee;
  }

  // Remove referee from competition
  async removeReferee(
    competitionId: string,
    refereeUserId: string,
    hostId: string,
    userRole?: string
  ): Promise<boolean> {
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (!this.isAuthorizedAsHost(competition, hostId, userRole)) {
      throw new Error('Not authorized to remove referees');
    }

    const refereeIndex = competition.referees.findIndex(
      (r) => r.userId.toString() === refereeUserId
    );

    if (refereeIndex === -1) {
      throw new Error('Referee not found');
    }

    competition.referees.splice(refereeIndex, 1);
    await competition.save();

    return true;
  }

  // Get all referees for a competition
  async getReferees(competitionId: string): Promise<IReferee[]> {
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    return competition.referees;
  }

  // Check if user is a referee
  async isReferee(competitionId: string, userId: string): Promise<boolean> {
    const competition = await Competition.findById(competitionId);
    if (!competition) return false;

    return competition.referees.some((r) => r.userId.toString() === userId);
  }

  // Update referee online status
  async updateRefereeStatus(
    competitionId: string,
    userId: string,
    isOnline: boolean,
    socketId?: string
  ): Promise<void> {
    await Competition.updateOne(
      {
        _id: competitionId,
        'referees.userId': new mongoose.Types.ObjectId(userId),
      },
      {
        $set: {
          'referees.$.isOnline': isOnline,
          'referees.$.socketId': socketId || null,
        },
      }
    );
  }

  // Check if referee has specific permission
  async hasRefereePermission(
    competitionId: string,
    userId: string,
    permission: RefereePermission
  ): Promise<boolean> {
    const competition = await Competition.findById(competitionId);
    if (!competition) return false;

    // Check if user is a referee
    const isReferee = competition.referees.some((r) => r.userId.toString() === userId);
    if (!isReferee) return false;

    // Check if permission is enabled
    return competition.settings.refereeSettings?.permissions?.includes(permission) || false;
  }

  // Referee: Override submission score
  async overrideSubmissionScore(
    competitionId: string,
    submissionId: string,
    newScore: number,
    refereeId: string,
    comment?: string
  ): Promise<void> {
    // Check permission
    const hasPermission = await this.hasRefereePermission(competitionId, refereeId, 'override_score');
    if (!hasPermission) {
      throw new Error('Not authorized to override scores');
    }

    const submission = await CompetitionSubmission.findById(submissionId);
    if (!submission || submission.competitionId.toString() !== competitionId) {
      throw new Error('Submission not found');
    }

    const oldScore = submission.points;
    const scoreDiff = newScore - oldScore;

    // Update submission
    submission.points = newScore;
    submission.refereeOverride = {
      overriddenBy: new mongoose.Types.ObjectId(refereeId),
      originalScore: oldScore,
      newScore,
      comment,
      overriddenAt: new Date(),
    };
    await submission.save();

    // Update participant total score
    await CompetitionParticipant.updateOne(
      { _id: submission.participantId },
      { $inc: { totalScore: scoreDiff } }
    );
  }

  // Referee: Manual judge (for blank/answer type questions)
  async manualJudge(
    competitionId: string,
    submissionId: string,
    isCorrect: boolean,
    refereeId: string,
    comment?: string
  ): Promise<void> {
    // Check permission
    const hasPermission = await this.hasRefereePermission(competitionId, refereeId, 'manual_judge');
    if (!hasPermission) {
      throw new Error('Not authorized for manual judging');
    }

    const submission = await CompetitionSubmission.findById(submissionId);
    if (!submission || submission.competitionId.toString() !== competitionId) {
      throw new Error('Submission not found');
    }

    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    const question = await CompetitionQuestion.findById(submission.questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    const wasCorrect = submission.isCorrect;
    const oldScore = submission.points;

    // Calculate new score
    let newScore = 0;
    if (isCorrect) {
      const basePoints = question.points || competition.settings.basePoints;
      newScore = basePoints;
      // Keep time bonus if answer is now correct
      if (submission.timeBonus) {
        newScore += submission.timeBonus;
      }
    } else if (competition.settings.penaltyForWrong) {
      newScore = -(competition.settings.penaltyPoints || 0);
    }

    const scoreDiff = newScore - oldScore;
    const correctCountDiff = isCorrect && !wasCorrect ? 1 : (!isCorrect && wasCorrect ? -1 : 0);

    // Update submission
    submission.isCorrect = isCorrect;
    submission.points = newScore;
    submission.refereeOverride = {
      overriddenBy: new mongoose.Types.ObjectId(refereeId),
      originalScore: oldScore,
      newScore,
      comment,
      overriddenAt: new Date(),
    };
    await submission.save();

    // Update participant stats
    const updateFields: Record<string, number> = {};
    if (scoreDiff !== 0) updateFields.totalScore = scoreDiff;
    if (correctCountDiff !== 0) updateFields.correctCount = correctCountDiff;

    if (Object.keys(updateFields).length > 0) {
      await CompetitionParticipant.updateOne(
        { _id: submission.participantId },
        { $inc: updateFields }
      );
    }
  }

  // Get submissions for a question (for referee review)
  async getQuestionSubmissions(
    competitionId: string,
    questionId: string
  ): Promise<{
    submission: typeof CompetitionSubmission.prototype;
    participant: ICompetitionParticipantDocument;
  }[]> {
    // Use populate to avoid N+1 query problem
    const submissions = await CompetitionSubmission.find({
      competitionId: new mongoose.Types.ObjectId(competitionId),
      questionId: new mongoose.Types.ObjectId(questionId),
    })
      .populate<{ participantId: ICompetitionParticipantDocument }>('participantId')
      .sort({ submittedAt: 1 });

    // Filter out submissions where participant wasn't found and transform to expected format
    return submissions
      .filter((s) => s.participantId)
      .map((s) => ({
        submission: s,
        participant: s.participantId as ICompetitionParticipantDocument,
      }));
  }
}

export const competitionService = new CompetitionService();
