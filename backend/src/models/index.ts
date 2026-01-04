// Auth models
export { User, type IUserDocument } from './user.model';
export { Session, type ISessionDocument } from './session.model';
export { VerificationCode, type IVerificationCodeDocument } from './verification-code.model';

// Problem models
export { ProblemBank, type IProblemBankDocument } from './problem-bank.model';
export { Problem, type IProblemDocument, type ProblemType, type DifficultyLevel, type IProblemOption } from './problem.model';
export { ProblemTag, type IProblemTagDocument } from './problem-tag.model';

// Competition models
export {
  Competition,
  type ICompetitionDocument,
  type CompetitionType,
  type CompetitionMode,
  type CompetitionStatus,
  type CompetitionPhase,
  type ParticipantMode,
  type TeamRoleMode,
  type ICompetitionSettings,
  type ITeamSettings,
  type IRefereeSettings,
  type ITimerState,
} from './competition.model';
export { CompetitionQuestion, type ICompetitionQuestionDocument, type QuestionStatus } from './competition-question.model';
export { CompetitionParticipant, type ICompetitionParticipantDocument, type ParticipantRole } from './competition-participant.model';
export { CompetitionSubmission, type ICompetitionSubmissionDocument } from './competition-submission.model';
export { CompetitionTeam, type ICompetitionTeamDocument, type TeamRole, type ITeamMember } from './competition-team.model';
