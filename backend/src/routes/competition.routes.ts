import { Router } from 'express';
import { competitionController } from '../controllers/competition.controller';
import { authenticate, optionalAuth } from '../middlewares/authenticate';
import { strictLimiter } from '../middlewares/rate-limiters';

const router = Router();

// Competition CRUD
router.post('/', authenticate, competitionController.create.bind(competitionController));
router.get('/', authenticate, competitionController.list.bind(competitionController));
// Apply strict rate limiting to join code lookup to prevent enumeration attacks
router.get('/code/:joinCode', strictLimiter, competitionController.getByJoinCode.bind(competitionController));
router.get('/:id', optionalAuth, competitionController.getById.bind(competitionController));
router.put('/:id', authenticate, competitionController.update.bind(competitionController));
router.delete('/:id', authenticate, competitionController.delete.bind(competitionController));

// Questions management
router.post('/:id/questions', authenticate, competitionController.addQuestions.bind(competitionController));
router.get('/:id/questions', authenticate, competitionController.getQuestions.bind(competitionController));
router.delete('/:id/questions/:questionId', authenticate, competitionController.removeQuestion.bind(competitionController));

// Participant actions
router.post('/join', optionalAuth, competitionController.join.bind(competitionController));
router.get('/:id/leaderboard', competitionController.getLeaderboard.bind(competitionController));

// Competition control (host only)
router.post('/:id/start', authenticate, competitionController.start.bind(competitionController));
router.post('/:id/pause', authenticate, competitionController.pause.bind(competitionController));
router.post('/:id/resume', authenticate, competitionController.resume.bind(competitionController));
router.post('/:id/end', authenticate, competitionController.end.bind(competitionController));
router.put('/:id/phase', authenticate, competitionController.updatePhase.bind(competitionController));

// Timer control (host only)
router.post('/:id/timer/start', authenticate, competitionController.startTimer.bind(competitionController));
router.post('/:id/timer/pause', authenticate, competitionController.pauseTimer.bind(competitionController));
router.post('/:id/timer/resume', authenticate, competitionController.resumeTimer.bind(competitionController));
router.put('/:id/timer/adjust', authenticate, competitionController.adjustTimer.bind(competitionController));

// Team management (optionalAuth for participants who may not have accounts)
router.post('/:id/teams', optionalAuth, competitionController.createTeam.bind(competitionController));
router.get('/:id/teams', competitionController.getTeams.bind(competitionController));
router.get('/:id/teams/leaderboard', competitionController.getTeamLeaderboard.bind(competitionController));
router.get('/:id/teams/:teamId', competitionController.getTeam.bind(competitionController));
router.post('/:id/teams/:teamId/join', optionalAuth, competitionController.joinTeam.bind(competitionController));
router.post('/:id/teams/:teamId/leave', optionalAuth, competitionController.leaveTeam.bind(competitionController));
router.delete('/:id/teams/:teamId', optionalAuth, competitionController.disbandTeam.bind(competitionController));

// Referee management
router.post('/:id/referees', authenticate, competitionController.addReferee.bind(competitionController));
router.get('/:id/referees', authenticate, competitionController.getReferees.bind(competitionController));
router.delete('/:id/referees/:refereeUserId', authenticate, competitionController.removeReferee.bind(competitionController));
router.get('/:id/referee/check', authenticate, competitionController.checkRefereeStatus.bind(competitionController));
router.post('/:id/referee/override-score', authenticate, competitionController.overrideScore.bind(competitionController));
router.post('/:id/referee/manual-judge', authenticate, competitionController.manualJudge.bind(competitionController));
router.get('/:id/questions/:questionId/submissions', authenticate, competitionController.getQuestionSubmissions.bind(competitionController));

export default router;
