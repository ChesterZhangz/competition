import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { competitionService } from '../services/competition.service';
import { timerService } from '../services/timer.service';
import { teamService } from '../services/team.service';
import { notificationService } from '../services/notification.service';
import { jwtUtils } from '../config/jwt';
import {
  Competition,
  CompetitionPhase,
  CompetitionParticipant,
  CompetitionQuestion,
} from '../models';
import {
  validateSocketData,
  joinSchema,
  joinHostSchema,
  joinRefereeSchema,
  competitionControlSchema,
  questionNextSchema,
  questionShowNowSchema,
  questionUpdatePointsSchema,
  answerSubmitSchema,
  answerRevealSchema,
  timerStartSchema,
  timerPauseSchema,
  timerResumeSchema,
  timerResetSchema,
  timerAdjustSchema,
  phaseChangeSchema,
  leaderboardShowSchema,
  leaderboardToggleSchema,
  teamCreateSchema,
  teamJoinSchema,
  teamUpdateRoleSchema,
} from '../validators/socket.validator';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string; // User's system role (student, teacher, admin, super_admin)
  participantId?: string;
  competitionId?: string;
  role?: 'host' | 'participant' | 'referee' | 'display';
}

// Room naming conventions
const getRooms = (competitionId: string) => ({
  all: `competition:${competitionId}`,
  host: `competition:${competitionId}:host`,
  referees: `competition:${competitionId}:referees`,
  display: `competition:${competitionId}:display`,
  team: (teamId: string) => `competition:${competitionId}:team:${teamId}`,
});

// Store active countdown timeouts so they can be cancelled
const activeCountdowns = new Map<string, NodeJS.Timeout>();

// Clear countdown for a competition
function clearCountdown(competitionId: string): void {
  const timeout = activeCountdowns.get(competitionId);
  if (timeout) {
    clearTimeout(timeout);
    activeCountdowns.delete(competitionId);
  }
}

export function setupCompetitionSocket(io: Server): void {
  const competitionNamespace = io.of('/competition');

  // Initialize timer service with Socket.IO server
  timerService.setSocketServer(io);

  // Authentication middleware
  competitionNamespace.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (token) {
        const payload = jwtUtils.verifyAccessToken(token);
        if (payload) {
          socket.userId = payload.userId;
          socket.userRole = payload.role; // Store user's system role
          console.log('Socket authenticated:', { socketId: socket.id, userId: payload.userId, userRole: payload.role });
        } else {
          console.log('Socket token invalid or expired:', { socketId: socket.id });
        }
      } else {
        console.log('Socket connected without token:', { socketId: socket.id });
      }
      next();
    } catch (error) {
      console.log('Socket auth error:', { socketId: socket.id, error: (error as Error).message });
      next();
    }
  });

  competitionNamespace.on('connection', (socket: AuthenticatedSocket) => {
    console.log('Socket connected:', socket.id);

    // ===== JOIN EVENTS =====

    // Join as participant
    socket.on('join', async (data: unknown) => {
      try {
        // Validate input data
        const validation = validateSocketData(joinSchema, data, 'join');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { joinCode, nickname, teamName, teamColor } = validation.data;

        const competition = await competitionService.getByJoinCode(joinCode);
        if (!competition) {
          socket.emit('error', { message: 'Invalid join code' });
          return;
        }

        const { competition: comp, participant } = await competitionService.join(
          joinCode,
          nickname,
          socket.userId,
          socket.id
        );

        socket.participantId = participant._id.toString();
        socket.competitionId = comp._id.toString();
        socket.role = 'participant';

        const rooms = getRooms(comp._id.toString());
        socket.join(rooms.all);

        // If participant has a team, join team room
        if (participant.teamId) {
          socket.join(rooms.team(participant.teamId.toString()));
        }

        // ===== ON-SITE MODE: Auto team matching =====
        // If team mode is enabled and teamName is provided, auto create/join team
        let participantTeam = participant.teamId
          ? await teamService.getTeamById(participant.teamId.toString())
          : null;
        let isNewTeam = false;
        let isCaptain = false;

        if (
          comp.mode === 'onsite' &&
          comp.settings.teamSettings?.enabled &&
          teamName &&
          !participant.teamId
        ) {
          try {
            // Find existing team with the same name
            const existingTeams = await teamService.getTeamsByCompetition(comp._id.toString());
            const matchingTeam = existingTeams.find(
              (t) => t.name.toLowerCase() === teamName.toLowerCase()
            );

            if (matchingTeam) {
              // Join existing team if not full
              if (matchingTeam.members.length < matchingTeam.maxSize) {
                participantTeam = await teamService.joinTeam(
                  matchingTeam._id.toString(),
                  participant._id.toString(),
                  'both'
                );
                // Join team room
                socket.join(rooms.team(matchingTeam._id.toString()));

                // Notify team members about new member joining
                socket.to(rooms.team(matchingTeam._id.toString())).emit('team:member-joined', {
                  teamId: matchingTeam._id,
                  member: {
                    participantId: participant._id,
                    nickname: participant.nickname,
                    role: 'both',
                    isOnline: true,
                  },
                });

                // Notify all about team update
                competitionNamespace.to(rooms.all).emit('team:updated', {
                  team: {
                    id: participantTeam._id,
                    name: participantTeam.name,
                    color: participantTeam.color,
                    captainId: participantTeam.captainId,
                    memberCount: participantTeam.members.length,
                    maxSize: participantTeam.maxSize,
                    members: participantTeam.members.map((m) => ({
                      participantId: m.participantId,
                      role: m.role,
                    })),
                  },
                });
              }
              // If team is full, participant joins without a team
            } else {
              // Create new team
              participantTeam = await teamService.createTeam(
                comp._id.toString(),
                participant._id.toString(),
                {
                  name: teamName,
                  color: teamColor || undefined,
                }
              );
              isNewTeam = true;
              isCaptain = true;

              // Join team room
              socket.join(rooms.team(participantTeam._id.toString()));

              // Notify all about new team created
              competitionNamespace.to(rooms.all).emit('team:new', {
                team: {
                  id: participantTeam._id,
                  name: participantTeam.name,
                  color: participantTeam.color,
                  captainId: participantTeam.captainId,
                  memberCount: participantTeam.members.length,
                  maxSize: participantTeam.maxSize,
                },
              });
            }
          } catch (teamError) {
            // Log team error but don't fail the join
            console.error('Auto team matching failed:', (teamError as Error).message);
          }
        }

        // Notify others via socket
        socket.to(rooms.all).emit('participant:joined', {
          participantId: participant._id,
          nickname: participant.nickname,
          avatar: participant.avatar,
          isOnline: true,
          teamId: participantTeam?._id,
          teamName: participantTeam?.name,
        });

        // Send notification to host (if host has a userId)
        if (comp.hostId) {
          notificationService.notifyParticipantJoined(
            comp.hostId.toString(),
            comp._id.toString(),
            comp.name,
            participant.nickname,
            comp.participantCount
          ).catch((err) => console.error('Failed to notify host:', err));
        }

        // Send current state to joiner
        const questions = await competitionService.getQuestions(comp._id.toString());
        const leaderboard = await competitionService.getLeaderboard(comp._id.toString());
        const teams = comp.settings.teamSettings?.enabled
          ? await teamService.getTeamsByCompetition(comp._id.toString())
          : [];

        // Get real-time timer state from Redis
        const redisTimerState = await timerService.getTimerState(comp._id.toString());
        let actualRemainingTime = redisTimerState?.remainingTime || 0;
        if (redisTimerState?.isRunning && redisTimerState?.startedAt) {
          const elapsed = Date.now() - redisTimerState.startedAt;
          actualRemainingTime = Math.max(0, redisTimerState.remainingTime - elapsed);
        }

        // Get current question if in question phase
        let currentQuestion = null;
        if (comp.currentPhase === 'question' && comp.currentQuestionIndex >= 0) {
          const question = questions.find(q => q.order === comp.currentQuestionIndex);
          if (question && question.problemId) {
            currentQuestion = {
              questionId: question._id.toString(),
              order: question.order,
              content: question.problemId.content,
              type: question.problemId.type,
              options: question.problemId.options,
              timeLimit: question.timeLimit || comp.settings.questionTimeLimit,
              points: question.points || comp.settings.basePoints,
            };
          }
        }

        socket.emit('joined', {
          competition: {
            id: comp._id,
            name: comp.name,
            type: comp.type,
            mode: comp.mode,
            status: comp.status,
            currentPhase: comp.currentPhase,
            participantMode: comp.participantMode,
            currentQuestionIndex: comp.currentQuestionIndex,
            settings: comp.settings,
            participantCount: comp.participantCount,
            teamCount: comp.teamCount,
            timerState: redisTimerState ? {
              remainingTime: actualRemainingTime,
              isRunning: redisTimerState.isRunning,
              totalDuration: redisTimerState.totalDuration,
            } : null,
          },
          currentQuestion,
          participant: {
            id: participant._id,
            nickname: participant.nickname,
            avatar: participant.avatar,
            teamId: participantTeam?._id,
            role: participant.role,
            totalScore: participant.totalScore,
            isCaptain,
          },
          team: participantTeam
            ? {
                id: participantTeam._id,
                name: participantTeam.name,
                color: participantTeam.color,
                captainId: participantTeam.captainId,
                memberCount: participantTeam.members.length,
                maxSize: participantTeam.maxSize,
                isNewTeam,
              }
            : null,
          questionCount: questions.length,
          teams: teams.map((t) => ({
            id: t._id,
            name: t.name,
            color: t.color,
            memberCount: t.members.length,
            maxSize: t.maxSize,
            captainId: t.captainId,
          })),
          leaderboard: leaderboard.map((p, i) => ({
            rank: i + 1,
            participantId: p._id,
            nickname: p.nickname,
            totalScore: p.totalScore,
          })),
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Join as host
    socket.on('join:host', async (data: unknown) => {
      try {
        const validation = validateSocketData(joinHostSchema, data, 'join:host');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId } = validation.data;

        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated. Please log in again.' });
          return;
        }

        const competition = await competitionService.getById(competitionId);
        if (!competition) {
          socket.emit('error', { message: 'Competition not found' });
          return;
        }

        // Debug: log user IDs
        console.log('Host join attempt:', {
          socketUserId: socket.userId,
          userRole: socket.userRole,
          competitionHostId: competition.hostId.toString(),
          competitionId,
        });

        // Allow host, admin, or super_admin to join as host
        const isHost = competition.hostId.toString() === socket.userId;
        const isAdmin = socket.userRole === 'admin' || socket.userRole === 'super_admin';

        if (!isHost && !isAdmin) {
          socket.emit('error', {
            message: `Not authorized as host. You are not the creator of this competition.`
          });
          return;
        }

        socket.competitionId = competition._id.toString();
        socket.role = 'host';

        const rooms = getRooms(competition._id.toString());
        socket.join([rooms.all, rooms.host]);

        const questions = await competitionService.getQuestions(competition._id.toString());
        const leaderboard = await competitionService.getLeaderboard(competition._id.toString(), 50);
        const teams = competition.settings.teamSettings?.enabled
          ? await teamService.getTeamsByCompetition(competition._id.toString())
          : [];

        // Get real-time timer state from Redis
        const redisTimerState = await timerService.getTimerState(competitionId);
        // Calculate actual remaining time if timer is running
        let actualRemainingTime = redisTimerState?.remainingTime || 0;
        if (redisTimerState?.isRunning && redisTimerState?.startedAt) {
          const elapsed = Date.now() - redisTimerState.startedAt;
          actualRemainingTime = Math.max(0, redisTimerState.remainingTime - elapsed);
        }

        socket.emit('host:joined', {
          competition: {
            id: competition._id,
            name: competition.name,
            type: competition.type,
            mode: competition.mode,
            status: competition.status,
            currentPhase: competition.currentPhase,
            participantMode: competition.participantMode,
            currentQuestionIndex: competition.currentQuestionIndex,
            questionCount: competition.questionCount,
            settings: competition.settings,
            // Use Redis timer state if available, otherwise use MongoDB state
            timerState: redisTimerState ? {
              remainingTime: actualRemainingTime,
              isRunning: redisTimerState.isRunning,
              totalDuration: redisTimerState.totalDuration,
            } : competition.timerState,
            participantCount: competition.participantCount,
            teamCount: competition.teamCount,
            joinCode: competition.joinCode,
          },
          questions: questions.map((q) => ({
            id: q._id,
            order: q.order,
            status: q.status,
            points: q.points,
            timeLimit: q.timeLimit,
            problem: q.problemId
              ? {
                  id: q.problemId._id,
                  content: q.problemId.content,
                  type: q.problemId.type,
                  options: q.problemId.options,
                  correctAnswer: q.problemId.correctAnswer,
                }
              : null,
          })),
          teams,
          leaderboard: leaderboard.map((p, i) => ({
            rank: i + 1,
            participantId: p._id,
            nickname: p.nickname,
            totalScore: p.totalScore,
            correctCount: p.correctCount,
            isOnline: p.isOnline,
          })),
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Join as display (large screen)
    socket.on('join:display', async (data: unknown) => {
      try {
        const validation = validateSocketData(joinHostSchema, data, 'join:display');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId } = validation.data;

        const competition = await competitionService.getById(competitionId);
        if (!competition) {
          socket.emit('error', { message: 'Competition not found' });
          return;
        }

        socket.competitionId = competition._id.toString();
        socket.role = 'display';

        const rooms = getRooms(competition._id.toString());
        socket.join([rooms.all, rooms.display]);

        // Get current question if competition is in question phase
        let currentQuestion = null;
        const questions = await competitionService.getQuestions(competitionId);
        if (competition.currentPhase === 'question' && competition.currentQuestionIndex >= 0) {
          const question = questions.find(q => q.order === competition.currentQuestionIndex);
          if (question && question.problemId) {
            currentQuestion = {
              questionId: question._id.toString(),
              order: question.order,
              content: question.problemId.content,
              type: question.problemId.type,
              options: question.problemId.options,
              timeLimit: question.timeLimit || competition.settings.questionTimeLimit,
              points: question.points || competition.settings.basePoints,
            };
          }
        }

        // Get real-time timer state from Redis
        const redisTimerState = await timerService.getTimerState(competitionId);
        // Calculate actual remaining time if timer is running
        let actualRemainingTime = redisTimerState?.remainingTime || 0;
        if (redisTimerState?.isRunning && redisTimerState?.startedAt) {
          const elapsed = Date.now() - redisTimerState.startedAt;
          actualRemainingTime = Math.max(0, redisTimerState.remainingTime - elapsed);
        }

        socket.emit('display:joined', {
          competition: {
            id: competition._id,
            name: competition.name,
            type: competition.type,
            mode: competition.mode,
            status: competition.status,
            currentPhase: competition.currentPhase,
            currentQuestionIndex: competition.currentQuestionIndex,
            questionCount: competition.questionCount,
            settings: competition.settings,
            timerState: redisTimerState ? {
              remainingTime: actualRemainingTime,
              isRunning: redisTimerState.isRunning,
              totalDuration: redisTimerState.totalDuration,
            } : competition.timerState,
            participantCount: competition.participantCount,
            teamCount: competition.teamCount,
            joinCode: competition.joinCode,
          },
          currentQuestion,
          questions: questions.map(q => ({
            id: q._id,
            order: q.order,
            status: q.status,
            points: q.points,
            timeLimit: q.timeLimit,
            problem: q.problemId ? {
              id: q.problemId._id,
              content: q.problemId.content,
              type: q.problemId.type,
              options: q.problemId.options,
            } : null,
          })),
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Join as referee
    socket.on('join:referee', async (data: unknown) => {
      try {
        const validation = validateSocketData(joinRefereeSchema, data, 'join:referee');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId } = validation.data;

        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated. Please log in.' });
          return;
        }

        const competition = await competitionService.getById(competitionId);
        if (!competition) {
          socket.emit('error', { message: 'Competition not found' });
          return;
        }

        // Check if user is a referee for this competition
        const isReferee = await competitionService.isReferee(competitionId, socket.userId);
        if (!isReferee) {
          socket.emit('error', { message: 'You are not a referee for this competition' });
          return;
        }

        socket.competitionId = competition._id.toString();
        socket.role = 'referee';

        const rooms = getRooms(competition._id.toString());
        socket.join([rooms.all, rooms.referees]);

        // Update referee online status
        await competitionService.updateRefereeStatus(
          competitionId,
          socket.userId,
          true,
          socket.id
        );

        // Get current questions and leaderboard
        const questions = await competitionService.getQuestions(competition._id.toString());
        const leaderboard = await competitionService.getLeaderboard(competition._id.toString(), 50);

        socket.emit('referee:joined', {
          competition: {
            id: competition._id,
            name: competition.name,
            type: competition.type,
            mode: competition.mode,
            status: competition.status,
            currentPhase: competition.currentPhase,
            participantMode: competition.participantMode,
            currentQuestionIndex: competition.currentQuestionIndex,
            questionCount: competition.questionCount,
            settings: competition.settings,
            timerState: competition.timerState,
            participantCount: competition.participantCount,
            teamCount: competition.teamCount,
          },
          permissions: competition.settings.refereeSettings?.permissions || [],
          questions: questions.map((q) => ({
            id: q._id,
            order: q.order,
            status: q.status,
            points: q.points,
            timeLimit: q.timeLimit,
            problem: q.problemId
              ? {
                  id: q.problemId._id,
                  content: q.problemId.content,
                  type: q.problemId.type,
                  options: q.problemId.options,
                  correctAnswer: q.problemId.correctAnswer,
                }
              : null,
          })),
          leaderboard: leaderboard.map((p, i) => ({
            rank: i + 1,
            participantId: p._id,
            nickname: p.nickname,
            totalScore: p.totalScore,
            correctCount: p.correctCount,
            isOnline: p.isOnline,
          })),
        });

        // Notify host that referee has joined
        competitionNamespace.to(rooms.host).emit('referee:online', {
          refereeId: socket.userId,
          isOnline: true,
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Helper to check if socket user is authorized as host
    const isAuthorizedHost = (competition: { hostId: { toString: () => string } }) => {
      const isOwner = competition.hostId.toString() === socket.userId;
      const isAdmin = socket.userRole === 'admin' || socket.userRole === 'super_admin';
      return isOwner || isAdmin;
    };

    // Helper to check if socket user is authorized as referee
    const isAuthorizedReferee = async (competitionId: string) => {
      if (!socket.userId) return false;
      return competitionService.isReferee(competitionId, socket.userId);
    };

    // ===== PHASE CONTROL (Host only) =====

    socket.on('phase:change', async (data: unknown) => {
      try {
        const validation = validateSocketData(phaseChangeSchema, data, 'phase:change');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId, phase } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        const competition = await Competition.findById(competitionId);
        if (!competition || !isAuthorizedHost(competition)) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        competition.currentPhase = phase;
        await competition.save();

        const rooms = getRooms(competitionId);
        competitionNamespace.to(rooms.all).emit('phase:changed', {
          phase,
          timestamp: Date.now(),
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // ===== COMPETITION CONTROL (Host only) =====

    socket.on('competition:start', async (data: unknown) => {
      try {
        const validation = validateSocketData(competitionControlSchema, data, 'competition:start');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        const competition = await competitionService.start(competitionId, socket.userId, socket.userRole);
        const rooms = getRooms(competitionId);

        competitionNamespace.to(rooms.all).emit('competition:started', {
          startTime: competition.actualStartTime,
          phase: 'waiting',
        });

        // Notify all participants with userId that competition has started
        const participants = await CompetitionParticipant.find({
          competitionId,
          userId: { $exists: true, $ne: null },
        }).select('userId');

        const userIds = participants
          .map((p) => p.userId?.toString())
          .filter((id): id is string => !!id);

        if (userIds.length > 0) {
          notificationService.notifyCompetitionStarted(
            userIds,
            competitionId,
            competition.name
          ).catch((err) => console.error('Failed to notify participants about start:', err));
        }
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('competition:pause', async (data: unknown) => {
      try {
        const validation = validateSocketData(competitionControlSchema, data, 'competition:pause');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Clear any pending countdown when pausing
        clearCountdown(competitionId);

        await competitionService.pause(competitionId, socket.userId, socket.userRole);
        await timerService.pauseTimer(competitionId);

        const rooms = getRooms(competitionId);
        competitionNamespace.to(rooms.all).emit('competition:paused', {
          timestamp: Date.now(),
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('competition:resume', async (data: unknown) => {
      try {
        const validation = validateSocketData(competitionControlSchema, data, 'competition:resume');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        await competitionService.resume(competitionId, socket.userId, socket.userRole);
        await timerService.resumeTimer(competitionId);

        const rooms = getRooms(competitionId);
        competitionNamespace.to(rooms.all).emit('competition:resumed', {
          timestamp: Date.now(),
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('competition:end', async (data: unknown) => {
      try {
        const validation = validateSocketData(competitionControlSchema, data, 'competition:end');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Clear any pending countdown when ending
        clearCountdown(competitionId);

        await timerService.stopTimer(competitionId);
        const competition = await competitionService.end(competitionId, socket.userId, socket.userRole);
        const leaderboard = await competitionService.getLeaderboard(competitionId, 100);

        // Update team rankings if in team mode
        if (competition.participantMode === 'team') {
          await teamService.updateTeamRankings(competitionId);
        }

        const rooms = getRooms(competitionId);
        competitionNamespace.to(rooms.all).emit('competition:ended', {
          endTime: competition.endTime,
          phase: 'finished',
          finalLeaderboard: leaderboard.map((p, i) => ({
            rank: i + 1,
            participantId: p._id,
            nickname: p.nickname,
            totalScore: p.totalScore,
            correctCount: p.correctCount,
          })),
        });

        // Notify all participants with userId about competition end with their results
        const participantsWithUser = await CompetitionParticipant.find({
          competitionId,
          userId: { $exists: true, $ne: null },
        }).select('userId totalScore correctCount');

        const results = participantsWithUser.map((p) => {
          const rank = leaderboard.findIndex(
            (lb) => lb._id.toString() === p._id.toString()
          ) + 1;
          return {
            userId: p.userId!.toString(),
            rank: rank || leaderboard.length + 1,
            totalScore: p.totalScore,
            correctCount: p.correctCount,
            totalQuestions: competition.questionCount,
          };
        }).filter((r) => r.userId);

        if (results.length > 0) {
          notificationService.notifyCompetitionEnded(
            results,
            competitionId,
            competition.name
          ).catch((err) => console.error('Failed to notify participants about end:', err));
        }
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // ===== QUESTION CONTROL (Host only) =====

    socket.on('question:next', async (data: unknown) => {
      try {
        const validation = validateSocketData(questionNextSchema, data, 'question:next');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Stop any existing timer
        await timerService.stopTimer(competitionId);

        const question = await competitionService.nextQuestion(competitionId, socket.userId, socket.userRole);

        if (question) {
          const problem = question.problemId;
          if (!problem) {
            socket.emit('error', { message: 'Problem not found' });
            return;
          }

          const competition = await competitionService.getById(competitionId);
          const timeLimit = question.timeLimit || competition?.settings.questionTimeLimit || 60;

          // Update phase to countdown
          await Competition.updateOne(
            { _id: competitionId },
            { currentPhase: 'countdown' }
          );

          const rooms = getRooms(competitionId);
          competitionNamespace.to(rooms.all).emit('question:preparing', {
            questionIndex: question.order,
            timeLimit,
            phase: 'countdown',
          });

          // Clear any existing countdown for this competition
          clearCountdown(competitionId);

          // After countdown (3 seconds), show question
          const countdownTimeout = setTimeout(async () => {
            // Remove from active countdowns since it's executing
            activeCountdowns.delete(competitionId);

            await Competition.updateOne(
              { _id: competitionId },
              { currentPhase: 'question' }
            );

            competitionNamespace.to(rooms.all).emit('question:show', {
              questionId: question._id,
              order: question.order,
              content: problem.content,
              type: problem.type,
              options: problem.options,
              timeLimit,
              points: question.points || competition?.settings.basePoints,
              phase: 'question',
            });

            // Start timer
            await timerService.startTimer(competitionId, question.order, timeLimit);
          }, 3000);

          // Store the timeout so it can be cancelled if needed
          activeCountdowns.set(competitionId, countdownTimeout);
        } else {
          socket.emit('question:none-remaining');
        }
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('question:show-now', async (data: unknown) => {
      try {
        const validation = validateSocketData(questionShowNowSchema, data, 'question:show-now');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId, questionIndex } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        const questions = await competitionService.getQuestions(competitionId);
        const question = questions.find((q) => q.order === questionIndex);

        if (!question) {
          socket.emit('error', { message: 'Question not found' });
          return;
        }

        const problem = question.problemId;
        if (!problem) {
          socket.emit('error', { message: 'Problem not found' });
          return;
        }

        const competition = await competitionService.getById(competitionId);
        const timeLimit = question.timeLimit || competition?.settings.questionTimeLimit || 60;

        // Update competition state
        await Competition.updateOne(
          { _id: competitionId },
          {
            currentQuestionIndex: questionIndex,
            currentPhase: 'question',
          }
        );

        const rooms = getRooms(competitionId);
        competitionNamespace.to(rooms.all).emit('question:show', {
          questionId: question._id,
          order: question.order,
          content: problem.content,
          type: problem.type,
          options: problem.options,
          timeLimit,
          points: question.points || competition?.settings.basePoints,
          phase: 'question',
        });

        // Start timer
        await timerService.startTimer(competitionId, question.order, timeLimit);
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Update question points (Host only)
    socket.on('question:updatePoints', async (data: unknown) => {
      try {
        // Validate input
        const validation = validateSocketData(questionUpdatePointsSchema, data, 'question:updatePoints');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId, questionId, points } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        const competition = await Competition.findById(competitionId);
        if (!competition || !isAuthorizedHost(competition)) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Update the question points in database
        await CompetitionQuestion.updateOne(
          { _id: questionId, competitionId },
          { points }
        );

        // Broadcast the update to all clients
        const rooms = getRooms(competitionId);
        competitionNamespace.to(rooms.all).emit('question:pointsUpdated', {
          questionId,
          points,
        });

        // Also notify host specifically
        socket.emit('question:pointsUpdated', {
          questionId,
          points,
          success: true,
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('answer:reveal', async (data: unknown) => {
      try {
        // Validate input
        const validation = validateSocketData(answerRevealSchema, data, 'answer:reveal');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId, questionId } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Stop timer
        await timerService.stopTimer(competitionId);

        await competitionService.revealAnswer(competitionId, questionId, socket.userId, socket.userRole);

        // Update phase
        await Competition.updateOne(
          { _id: competitionId },
          { currentPhase: 'revealing' }
        );

        const questions = await competitionService.getQuestions(competitionId);
        const question = questions.find((q) => q._id.toString() === questionId);

        if (question && question.problemId) {
          const rooms = getRooms(competitionId);
          competitionNamespace.to(rooms.all).emit('answer:revealed', {
            questionId,
            correctAnswer: question.problemId.correctAnswer,
            explanation: question.problemId.answerExplanation,
            phase: 'revealing',
          });

          // Send updated leaderboard
          const leaderboard = await competitionService.getLeaderboard(competitionId);
          competitionNamespace.to(rooms.all).emit('leaderboard:update', {
            leaderboard: leaderboard.map((p, i) => ({
              rank: i + 1,
              participantId: p._id,
              nickname: p.nickname,
              totalScore: p.totalScore,
              correctCount: p.correctCount,
            })),
          });
        }
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Show/Hide Leaderboard (Host only)
    socket.on('leaderboard:toggle', async (data: unknown) => {
      try {
        const validation = validateSocketData(leaderboardToggleSchema, data, 'leaderboard:toggle');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId, visible } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        const competition = await competitionService.getById(competitionId);
        if (!competition || !isAuthorizedHost(competition)) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Update phase to leaderboard if visible
        if (visible) {
          await Competition.updateOne(
            { _id: competitionId },
            { currentPhase: 'leaderboard' }
          );

          // Get and send leaderboard data
          const leaderboard = await competitionService.getLeaderboard(competitionId);
          const rooms = getRooms(competitionId);

          competitionNamespace.to(rooms.all).emit('leaderboard:update', {
            individual: leaderboard.map((p, i) => ({
              rank: i + 1,
              participantId: p._id,
              nickname: p.nickname,
              totalScore: p.totalScore,
              correctCount: p.correctCount,
            })),
          });

          // Broadcast phase change
          competitionNamespace.to(rooms.all).emit('phase:changed', {
            phase: 'leaderboard',
          });
        }

        // Broadcast visibility toggle
        const rooms = getRooms(competitionId);
        competitionNamespace.to(rooms.all).emit('leaderboard:toggle', {
          visible,
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // ===== TIMER CONTROL (Host only) =====

    socket.on('timer:start', async (data: unknown) => {
      try {
        const validation = validateSocketData(timerStartSchema, data, 'timer:start');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId, duration } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        const competition = await competitionService.getById(competitionId);
        if (!competition || !isAuthorizedHost(competition)) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // duration is in milliseconds from frontend, convert to seconds for timerService
        const durationSeconds = Math.ceil(duration / 1000);
        await timerService.startTimer(
          competitionId,
          competition.currentQuestionIndex,
          durationSeconds
        );
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('timer:pause', async (data: unknown) => {
      try {
        const validation = validateSocketData(timerPauseSchema, data, 'timer:pause');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        await timerService.pauseTimer(competitionId);
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('timer:resume', async (data: unknown) => {
      try {
        const validation = validateSocketData(timerResumeSchema, data, 'timer:resume');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        await timerService.resumeTimer(competitionId);
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('timer:reset', async (data: unknown) => {
      try {
        const validation = validateSocketData(timerResetSchema, data, 'timer:reset');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId, duration } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // duration is in milliseconds from frontend, convert to seconds for timerService
        const durationSeconds = duration ? Math.ceil(duration / 1000) : undefined;
        await timerService.resetTimer(competitionId, durationSeconds);
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('timer:adjust', async (data: unknown) => {
      try {
        const validation = validateSocketData(timerAdjustSchema, data, 'timer:adjust');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId, adjustment } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // adjustment is in milliseconds from frontend, convert to seconds for timerService
        const adjustmentSeconds = Math.round(adjustment / 1000);
        await timerService.adjustTimer(competitionId, adjustmentSeconds);
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // ===== LEADERBOARD CONTROL =====

    socket.on('leaderboard:show', async (data: unknown) => {
      try {
        const validation = validateSocketData(leaderboardShowSchema, data, 'leaderboard:show');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId } = validation.data;

        if (!socket.userId || socket.role !== 'host') {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        const competition = await competitionService.getById(competitionId);
        if (!competition || !isAuthorizedHost(competition)) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        await Competition.updateOne(
          { _id: competitionId },
          { currentPhase: 'leaderboard' }
        );

        const leaderboard = await competitionService.getLeaderboard(competitionId, 50);
        let teamLeaderboard: Awaited<ReturnType<typeof teamService.getTeamLeaderboard>> = [];

        if (competition.participantMode === 'team') {
          teamLeaderboard = await teamService.getTeamLeaderboard(competitionId, 50);
        }

        const rooms = getRooms(competitionId);
        competitionNamespace.to(rooms.all).emit('leaderboard:show', {
          phase: 'leaderboard',
          leaderboard: leaderboard.map((p, i) => ({
            rank: i + 1,
            participantId: p._id,
            nickname: p.nickname,
            totalScore: p.totalScore,
            correctCount: p.correctCount,
          })),
          teamLeaderboard,
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // ===== TEAM EVENTS =====

    socket.on('team:create', async (data: unknown) => {
      try {
        const validation = validateSocketData(teamCreateSchema, data, 'team:create');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { name, color } = validation.data;

        if (!socket.participantId || !socket.competitionId) {
          socket.emit('error', { message: 'Not in a competition' });
          return;
        }

        const team = await teamService.createTeam(
          socket.competitionId,
          socket.participantId,
          { name, color }
        );

        const rooms = getRooms(socket.competitionId);
        socket.join(rooms.team(team._id.toString()));

        socket.emit('team:created', {
          team: {
            id: team._id,
            name: team.name,
            color: team.color,
            captainId: team.captainId,
            memberCount: team.members.length,
            maxSize: team.maxSize,
          },
        });

        competitionNamespace.to(rooms.all).emit('team:new', {
          team: {
            id: team._id,
            name: team.name,
            color: team.color,
            memberCount: team.members.length,
            maxSize: team.maxSize,
          },
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('team:join', async (data: unknown) => {
      try {
        const validation = validateSocketData(teamJoinSchema, data, 'team:join');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { teamId, role } = validation.data;

        if (!socket.participantId || !socket.competitionId) {
          socket.emit('error', { message: 'Not in a competition' });
          return;
        }

        const team = await teamService.joinTeam(
          teamId,
          socket.participantId,
          role || 'both'
        );

        const rooms = getRooms(socket.competitionId);
        socket.join(rooms.team(team._id.toString()));

        const participant = await CompetitionParticipant.findById(socket.participantId);

        socket.emit('team:joined', {
          team: {
            id: team._id,
            name: team.name,
            color: team.color,
            captainId: team.captainId,
            memberCount: team.members.length,
            members: team.members,
          },
        });

        competitionNamespace.to(rooms.all).emit('team:member-joined', {
          teamId: team._id,
          member: {
            participantId: socket.participantId,
            nickname: participant?.nickname,
            role: role || 'both',
          },
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('team:leave', async () => {
      try {
        if (!socket.participantId || !socket.competitionId) {
          socket.emit('error', { message: 'Not in a competition' });
          return;
        }

        const participant = await CompetitionParticipant.findById(socket.participantId);
        if (!participant?.teamId) {
          socket.emit('error', { message: 'Not in a team' });
          return;
        }

        const teamId = participant.teamId.toString();
        await teamService.leaveTeam(teamId, socket.participantId);

        const rooms = getRooms(socket.competitionId);
        socket.leave(rooms.team(teamId));

        socket.emit('team:left');

        competitionNamespace.to(rooms.all).emit('team:member-left', {
          teamId,
          participantId: socket.participantId,
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('team:update-role', async (data: unknown) => {
      try {
        const validation = validateSocketData(teamUpdateRoleSchema, data, 'team:update-role');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { participantId, role } = validation.data;

        if (!socket.participantId || !socket.competitionId) {
          socket.emit('error', { message: 'Not in a competition' });
          return;
        }

        const participant = await CompetitionParticipant.findById(socket.participantId);
        if (!participant?.teamId) {
          socket.emit('error', { message: 'Not in a team' });
          return;
        }

        const team = await teamService.updateMemberRole(
          participant.teamId.toString(),
          participantId,
          role,
          socket.participantId
        );

        const rooms = getRooms(socket.competitionId);
        competitionNamespace.to(rooms.team(team._id.toString())).emit('team:role-updated', {
          participantId,
          role,
        });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // ===== PARTICIPANT ACTIONS =====

    socket.on('answer:submit', async (data: unknown) => {
      try {
        const validation = validateSocketData(answerSubmitSchema, data, 'answer:submit');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { questionId, answer, timeSpent } = validation.data;

        if (!socket.participantId || !socket.competitionId) {
          socket.emit('error', { message: 'Not in a competition' });
          return;
        }

        // Check if participant can submit (based on team role)
        const canSubmit = await teamService.canSubmit(socket.participantId);
        if (!canSubmit) {
          socket.emit('error', { message: 'Your role does not allow submitting answers' });
          return;
        }

        const result = await competitionService.submitAnswer(
          socket.competitionId,
          questionId,
          socket.participantId,
          answer,
          timeSpent
        );

        socket.emit('answer:result', {
          questionId,
          isCorrect: result.isCorrect,
          points: result.points,
        });

        // Update team scores if in team mode
        const participant = await CompetitionParticipant.findById(socket.participantId);
        if (participant?.teamId) {
          await teamService.updateTeamScores(socket.competitionId);

          const rooms = getRooms(socket.competitionId);
          const team = await teamService.getTeamById(participant.teamId.toString());
          if (team) {
            competitionNamespace.to(rooms.team(team._id.toString())).emit('team:score-updated', {
              teamId: team._id,
              totalScore: team.totalScore,
              averageScore: team.averageScore,
            });
          }
        }
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // ===== REFEREE ACTIONS =====

    // Referee: Override participant score
    socket.on('score:override', async (data: unknown) => {
      try {
        const validation = validateSocketData(z.object({
          competitionId: z.string(),
          participantId: z.string(),
          newScore: z.number(),
          reason: z.string().optional(),
        }), data, 'score:override');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId, participantId, newScore, reason } = validation.data;

        // Check if user is host or referee
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const competition = await competitionService.getById(competitionId);
        if (!competition) {
          socket.emit('error', { message: 'Competition not found' });
          return;
        }

        const isHost = competition.hostId.toString() === socket.userId;
        const isReferee = await competitionService.isReferee(competitionId, socket.userId);

        if (!isHost && !isReferee) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // If referee, check permission
        if (isReferee && !isHost) {
          const hasPermission = await competitionService.hasRefereePermission(competitionId, socket.userId, 'override_score');
          if (!hasPermission) {
            socket.emit('error', { message: 'No permission to override scores' });
            return;
          }
        }

        // Get participant and update score
        const participant = await CompetitionParticipant.findById(participantId);
        if (!participant || participant.competitionId.toString() !== competitionId) {
          socket.emit('error', { message: 'Participant not found' });
          return;
        }

        const oldScore = participant.totalScore;
        participant.totalScore = newScore;
        await participant.save();

        // Broadcast score update
        const rooms = getRooms(competitionId);
        competitionNamespace.to(rooms.all).emit('score:updated', {
          participantId,
          oldScore,
          newScore,
          updatedBy: socket.userId,
          reason,
        });

        // Update leaderboard
        const leaderboard = await competitionService.getLeaderboard(competitionId);
        competitionNamespace.to(rooms.all).emit('leaderboard:update', {
          individual: leaderboard.map((p, i) => ({
            rank: i + 1,
            participantId: p._id,
            nickname: p.nickname,
            totalScore: p.totalScore,
            correctCount: p.correctCount,
          })),
        });

        socket.emit('score:override:success', { participantId, newScore });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Referee: Add bonus points to participant
    socket.on('score:addBonus', async (data: unknown) => {
      try {
        const validation = validateSocketData(z.object({
          competitionId: z.string(),
          participantId: z.string(),
          bonusPoints: z.number(),
          reason: z.string().optional(),
        }), data, 'score:addBonus');
        if (!validation.success) {
          socket.emit('error', { message: validation.error });
          return;
        }
        const { competitionId, participantId, bonusPoints, reason } = validation.data;

        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const competition = await competitionService.getById(competitionId);
        if (!competition) {
          socket.emit('error', { message: 'Competition not found' });
          return;
        }

        const isHost = competition.hostId.toString() === socket.userId;
        const isReferee = await competitionService.isReferee(competitionId, socket.userId);

        if (!isHost && !isReferee) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Get participant and add bonus
        const participant = await CompetitionParticipant.findById(participantId);
        if (!participant || participant.competitionId.toString() !== competitionId) {
          socket.emit('error', { message: 'Participant not found' });
          return;
        }

        const oldScore = participant.totalScore;
        participant.totalScore += bonusPoints;
        await participant.save();

        // Broadcast score update
        const rooms = getRooms(competitionId);
        competitionNamespace.to(rooms.all).emit('score:updated', {
          participantId,
          oldScore,
          newScore: participant.totalScore,
          bonusPoints,
          updatedBy: socket.userId,
          reason,
        });

        // Update leaderboard
        const leaderboard = await competitionService.getLeaderboard(competitionId);
        competitionNamespace.to(rooms.all).emit('leaderboard:update', {
          individual: leaderboard.map((p, i) => ({
            rank: i + 1,
            participantId: p._id,
            nickname: p.nickname,
            totalScore: p.totalScore,
            correctCount: p.correctCount,
          })),
        });

        socket.emit('score:addBonus:success', { participantId, newScore: participant.totalScore, bonusPoints });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // ===== DISCONNECT HANDLING =====

    socket.on('disconnect', async () => {
      console.log('Socket disconnected:', socket.id);

      if (socket.participantId) {
        await competitionService.leave(socket.participantId);

        if (socket.competitionId) {
          const rooms = getRooms(socket.competitionId);
          socket.to(rooms.all).emit('participant:left', {
            participantId: socket.participantId,
          });
        }
      }

      // Handle referee disconnect
      if (socket.role === 'referee' && socket.competitionId && socket.userId) {
        await competitionService.updateRefereeStatus(
          socket.competitionId,
          socket.userId,
          false
        );

        const rooms = getRooms(socket.competitionId);
        competitionNamespace.to(rooms.host).emit('referee:online', {
          refereeId: socket.userId,
          isOnline: false,
        });
      }
    });
  });
}
