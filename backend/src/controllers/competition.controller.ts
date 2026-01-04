import { Request, Response, NextFunction } from 'express';
import { competitionService } from '../services/competition.service';
import { teamService } from '../services/team.service';
import { timerService } from '../services/timer.service';
import { Competition, CompetitionPhase, CompetitionParticipant } from '../models';
import {
  createCompetitionSchema,
  updateCompetitionSchema,
  addQuestionsSchema,
  joinCompetitionSchema,
} from '../validators/competition.validator';
import { ZodError } from 'zod';

export class CompetitionController {
  // Helper method to verify participant belongs to the current user
  private async verifyParticipantOwnership(
    participantId: string,
    userId?: string
  ): Promise<{ valid: boolean; error?: string }> {
    const participant = await CompetitionParticipant.findById(participantId);
    if (!participant) {
      return { valid: false, error: 'Participant not found' };
    }

    // If participant has a userId, it must match the current user
    if (participant.userId) {
      if (!userId) {
        return { valid: false, error: 'Authentication required for this participant' };
      }
      if (participant.userId.toString() !== userId) {
        return { valid: false, error: 'You can only perform actions for your own participant' };
      }
    }

    return { valid: true };
  }

  // POST /api/competitions
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createCompetitionSchema.parse(req.body);
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const competition = await competitionService.create(input, userId);
      res.status(201).json({
        success: true,
        data: competition,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors } });
        return;
      }
      next(error);
    }
  }

  // GET /api/competitions
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      const result = await competitionService.listByHost(userId, {
        page,
        limit,
        status: status as any,
      });
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/competitions/:id
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const competition = await competitionService.getById(req.params.id);
      if (!competition) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Competition not found' } });
        return;
      }

      res.json({
        success: true,
        data: competition,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/competitions/code/:joinCode
  async getByJoinCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const competition = await competitionService.getByJoinCode(req.params.joinCode);
      if (!competition) {
        res.status(404).json({ success: false, error: { code: 'INVALID_JOIN_CODE', message: 'Invalid join code' } });
        return;
      }

      res.json({
        success: true,
        data: {
          id: competition._id,
          name: competition.name,
          description: competition.description,
          type: competition.type,
          mode: competition.mode,
          status: competition.status,
          participantCount: competition.participantCount,
          settings: {
            maxParticipants: competition.settings.maxParticipants,
            allowLateJoin: competition.settings.allowLateJoin,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/competitions/:id
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateCompetitionSchema.parse(req.body);
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const competition = await competitionService.update(req.params.id, input, userId, req.user?.role);
      if (!competition) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Competition not found' } });
        return;
      }

      res.json({
        success: true,
        data: competition,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors } });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // DELETE /api/competitions/:id
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const deleted = await competitionService.delete(req.params.id, userId, req.user?.role);
      if (!deleted) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Competition not found' } });
        return;
      }

      res.json({
        success: true,
        message: 'Competition deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // POST /api/competitions/:id/questions
  async addQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = addQuestionsSchema.parse(req.body);
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const questions = await competitionService.addQuestions(req.params.id, input, userId, req.user?.role);
      res.status(201).json({
        success: true,
        data: questions,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors } });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // GET /api/competitions/:id/questions
  async getQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const questions = await competitionService.getQuestions(req.params.id);
      res.json({
        success: true,
        data: questions,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/competitions/:id/questions/:questionId
  async removeQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      await competitionService.removeQuestion(req.params.questionId, userId, req.user?.role);
      res.json({
        success: true,
        message: 'Question removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/competitions/join
  async join(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = joinCompetitionSchema.parse(req.body);
      const userId = req.user?.userId;

      const result = await competitionService.join(
        input.joinCode,
        input.nickname,
        userId
      );

      res.json({
        success: true,
        data: {
          competition: {
            id: result.competition._id,
            name: result.competition.name,
            type: result.competition.type,
            status: result.competition.status,
          },
          participant: {
            id: result.participant._id,
            nickname: result.participant.nickname,
          },
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors } });
        return;
      }
      if (error instanceof Error) {
        if (error.message === 'Invalid join code') {
          res.status(404).json({ success: false, error: { code: 'INVALID_JOIN_CODE', message: error.message } });
          return;
        }
        if (error.message.includes('ended') || error.message.includes('full')) {
          res.status(400).json({ success: false, error: { code: 'CANNOT_JOIN', message: error.message } });
          return;
        }
      }
      next(error);
    }
  }

  // GET /api/competitions/:id/leaderboard
  async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await competitionService.getLeaderboard(req.params.id, limit);

      res.json({
        success: true,
        data: leaderboard.map((p, index) => ({
          rank: index + 1,
          participantId: p._id,
          nickname: p.nickname,
          avatar: p.avatar,
          totalScore: p.totalScore,
          correctCount: p.correctCount,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  // ===== COMPETITION CONTROL =====

  // POST /api/competitions/:id/start
  async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const competition = await competitionService.start(req.params.id, userId, req.user?.role);
      res.json({
        success: true,
        data: {
          status: competition.status,
          actualStartTime: competition.actualStartTime,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // POST /api/competitions/:id/pause
  async pause(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      await competitionService.pause(req.params.id, userId, req.user?.role);
      await timerService.pauseTimer(req.params.id);
      res.json({ success: true, message: 'Competition paused' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // POST /api/competitions/:id/resume
  async resume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      await competitionService.resume(req.params.id, userId, req.user?.role);
      await timerService.resumeTimer(req.params.id);
      res.json({ success: true, message: 'Competition resumed' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // POST /api/competitions/:id/end
  async end(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      await timerService.stopTimer(req.params.id);
      const competition = await competitionService.end(req.params.id, userId, req.user?.role);
      res.json({
        success: true,
        data: {
          status: competition.status,
          endTime: competition.endTime,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // PUT /api/competitions/:id/phase
  async updatePhase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const { phase } = req.body as { phase: CompetitionPhase };
      const competition = await Competition.findById(req.params.id);

      if (!competition) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Competition not found' } });
        return;
      }

      const isOwner = competition.hostId.toString() === userId;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
      if (!isOwner && !isAdmin) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
        return;
      }

      competition.currentPhase = phase;
      await competition.save();

      res.json({
        success: true,
        data: { phase: competition.currentPhase },
      });
    } catch (error) {
      next(error);
    }
  }

  // ===== TIMER CONTROL =====

  // POST /api/competitions/:id/timer/start
  async startTimer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const competition = await Competition.findById(req.params.id);
      const isOwner = competition?.hostId.toString() === userId;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
      if (!competition || (!isOwner && !isAdmin)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
        return;
      }

      const { duration } = req.body as { duration: number };
      const timerState = await timerService.startTimer(
        req.params.id,
        competition.currentQuestionIndex,
        duration
      );

      res.json({ success: true, data: timerState });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/competitions/:id/timer/pause
  async pauseTimer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const competition = await Competition.findById(req.params.id);
      const isOwner = competition?.hostId.toString() === userId;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
      if (!competition || (!isOwner && !isAdmin)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
        return;
      }

      const timerState = await timerService.pauseTimer(req.params.id);
      res.json({ success: true, data: timerState });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/competitions/:id/timer/resume
  async resumeTimer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const competition = await Competition.findById(req.params.id);
      const isOwner = competition?.hostId.toString() === userId;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
      if (!competition || (!isOwner && !isAdmin)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
        return;
      }

      const timerState = await timerService.resumeTimer(req.params.id);
      res.json({ success: true, data: timerState });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/competitions/:id/timer/adjust
  async adjustTimer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const competition = await Competition.findById(req.params.id);
      const isOwner = competition?.hostId.toString() === userId;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
      if (!competition || (!isOwner && !isAdmin)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
        return;
      }

      const { adjustment } = req.body as { adjustment: number };
      const timerState = await timerService.adjustTimer(req.params.id, adjustment);
      res.json({ success: true, data: timerState });
    } catch (error) {
      next(error);
    }
  }

  // ===== TEAM MANAGEMENT =====

  // POST /api/competitions/:id/teams
  async createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { participantId, name, color } = req.body as {
        participantId: string;
        name: string;
        color?: string;
      };

      // Verify the participant belongs to the current user
      const verification = await this.verifyParticipantOwnership(participantId, req.user?.userId);
      if (!verification.valid) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: verification.error } });
        return;
      }

      const team = await teamService.createTeam(req.params.id, participantId, { name, color });
      res.status(201).json({ success: true, data: team });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not enabled')) {
          res.status(400).json({ success: false, error: { code: 'TEAM_MODE_DISABLED', message: error.message } });
          return;
        }
        if (error.message.includes('already')) {
          res.status(400).json({ success: false, error: { code: 'ALREADY_IN_TEAM', message: error.message } });
          return;
        }
      }
      next(error);
    }
  }

  // GET /api/competitions/:id/teams
  async getTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teams = await teamService.getTeamsByCompetition(req.params.id);
      res.json({ success: true, data: teams });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/competitions/:id/teams/:teamId
  async getTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const team = await teamService.getTeamById(req.params.teamId);
      if (!team) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Team not found' } });
        return;
      }
      res.json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/competitions/:id/teams/:teamId/join
  async joinTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { participantId, role } = req.body as {
        participantId: string;
        role?: 'viewer' | 'submitter' | 'both';
      };

      // Verify the participant belongs to the current user
      const verification = await this.verifyParticipantOwnership(participantId, req.user?.userId);
      if (!verification.valid) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: verification.error } });
        return;
      }

      const team = await teamService.joinTeam(req.params.teamId, participantId, role);
      res.json({ success: true, data: team });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('full')) {
          res.status(400).json({ success: false, error: { code: 'TEAM_FULL', message: error.message } });
          return;
        }
        if (error.message.includes('already')) {
          res.status(400).json({ success: false, error: { code: 'ALREADY_IN_TEAM', message: error.message } });
          return;
        }
      }
      next(error);
    }
  }

  // POST /api/competitions/:id/teams/:teamId/leave
  async leaveTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { participantId } = req.body as { participantId: string };

      // Verify the participant belongs to the current user
      const verification = await this.verifyParticipantOwnership(participantId, req.user?.userId);
      if (!verification.valid) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: verification.error } });
        return;
      }

      await teamService.leaveTeam(req.params.teamId, participantId);
      res.json({ success: true, message: 'Left team successfully' });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/competitions/:id/teams/:teamId
  async disbandTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { captainId } = req.body as { captainId: string };

      // Verify the captain belongs to the current user
      const verification = await this.verifyParticipantOwnership(captainId, req.user?.userId);
      if (!verification.valid) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: verification.error } });
        return;
      }

      await teamService.disbandTeam(req.params.teamId, captainId);
      res.json({ success: true, message: 'Team disbanded successfully' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Only captain')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // GET /api/competitions/:id/teams/leaderboard
  async getTeamLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await teamService.getTeamLeaderboard(req.params.id, limit);
      res.json({ success: true, data: leaderboard });
    } catch (error) {
      next(error);
    }
  }

  // ===== REFEREE MANAGEMENT =====

  // POST /api/competitions/:id/referees
  async addReferee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const { email } = req.body as { email: string };
      if (!email) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is required' } });
        return;
      }

      const referee = await competitionService.addReferee(req.params.id, email, userId, req.user?.role);
      res.status(201).json({ success: true, data: referee });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Not authorized')) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
          return;
        }
        if (error.message.includes('not found') || error.message.includes('not enabled')) {
          res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: error.message } });
          return;
        }
        if (error.message.includes('already') || error.message.includes('Maximum')) {
          res.status(409).json({ success: false, error: { code: 'CONFLICT', message: error.message } });
          return;
        }
      }
      next(error);
    }
  }

  // DELETE /api/competitions/:id/referees/:refereeUserId
  async removeReferee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      await competitionService.removeReferee(req.params.id, req.params.refereeUserId, userId, req.user?.role);
      res.json({ success: true, message: 'Referee removed successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Not authorized')) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
          return;
        }
        if (error.message.includes('not found')) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
          return;
        }
      }
      next(error);
    }
  }

  // GET /api/competitions/:id/referees
  async getReferees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const referees = await competitionService.getReferees(req.params.id);
      res.json({ success: true, data: referees });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // GET /api/competitions/:id/referee/check
  async checkRefereeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const competition = await competitionService.getById(req.params.id);
      if (!competition) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Competition not found' } });
        return;
      }

      // Check if referee feature is enabled
      const refereeEnabled = competition.settings.refereeSettings?.enabled === true;
      if (!refereeEnabled) {
        res.json({
          success: true,
          data: {
            isReferee: false,
            refereeEnabled: false,
            permissions: [],
          },
        });
        return;
      }

      const isReferee = await competitionService.isReferee(req.params.id, userId);

      res.json({
        success: true,
        data: {
          isReferee,
          refereeEnabled: true,
          permissions: isReferee ? competition.settings.refereeSettings?.permissions || [] : [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/competitions/:id/referee/override-score
  async overrideScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const { submissionId, newScore, comment } = req.body as {
        submissionId: string;
        newScore: number;
        comment?: string;
      };

      await competitionService.overrideSubmissionScore(
        req.params.id,
        submissionId,
        newScore,
        userId,
        comment
      );
      res.json({ success: true, message: 'Score overridden successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Not authorized')) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
          return;
        }
        if (error.message.includes('not found')) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
          return;
        }
      }
      next(error);
    }
  }

  // POST /api/competitions/:id/referee/manual-judge
  async manualJudge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const { submissionId, isCorrect, comment } = req.body as {
        submissionId: string;
        isCorrect: boolean;
        comment?: string;
      };

      await competitionService.manualJudge(
        req.params.id,
        submissionId,
        isCorrect,
        userId,
        comment
      );
      res.json({ success: true, message: 'Manual judgment applied successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Not authorized')) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
          return;
        }
        if (error.message.includes('not found')) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
          return;
        }
      }
      next(error);
    }
  }

  // GET /api/competitions/:id/questions/:questionId/submissions
  async getQuestionSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      // Check if user is host or referee
      const competition = await competitionService.getById(req.params.id);
      if (!competition) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Competition not found' } });
        return;
      }

      const isHost = competition.hostId.toString() === userId;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
      const isReferee = await competitionService.isReferee(req.params.id, userId);

      if (!isHost && !isAdmin && !isReferee) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to view submissions' } });
        return;
      }

      const submissions = await competitionService.getQuestionSubmissions(
        req.params.id,
        req.params.questionId
      );
      res.json({ success: true, data: submissions });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/competitions/users/search?q=query
  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      // Only teachers and admins can search users
      const role = req.user?.role;
      if (role !== 'teacher' && role !== 'admin' && role !== 'super_admin') {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
        return;
      }

      const query = req.query.q as string || '';
      const users = await competitionService.searchUsers(query, 10);
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }
}

export const competitionController = new CompetitionController();
