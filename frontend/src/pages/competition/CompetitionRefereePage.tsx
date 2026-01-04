import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { competitionApi, type RefereePermission, type Submission } from '@/services/competition.api';
import { connectAsReferee, disconnectSocket, onSocketEvent } from '@/services/socket';
import { useCompetitionStore } from '@/store/competitionStore';

interface Competition {
  _id: string;
  name: string;
  status: string;
  currentQuestionIndex: number;
  participantCount: number;
  settings: {
    questionTimeLimit: number;
    basePoints: number;
    showLeaderboard: boolean;
  };
}

interface Question {
  id: string;
  order: number;
  content: string;
  type: string;
  options?: Array<{ id: string; label: string; content: string }>;
  correctAnswer?: string | string[];
  timeLimit: number;
  points: number;
  status: string;
}

interface TimerState {
  remainingTime: number;
  isRunning: boolean;
  totalDuration: number;
}

export function CompetitionRefereePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Use competition store for shared state
  const {
    currentPhase,
    timeRemaining,
    timerPaused,
    refereePermissions,
  } = useCompetitionStore();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [permissions, setPermissions] = useState<RefereePermission[]>(refereePermissions as RefereePermission[]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isReferee, setIsReferee] = useState(false);
  const [timerState, setTimerState] = useState<TimerState>({
    remainingTime: timeRemaining,
    isRunning: !timerPaused && currentPhase === 'question',
    totalDuration: 60000,
  });

  // Override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideComment, setOverrideComment] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);

  // Manual judge state
  const [isJudging, setIsJudging] = useState(false);

  // Check if user is referee
  useEffect(() => {
    const checkRefereeStatus = async () => {
      if (!id) return;
      try {
        const result = await competitionApi.checkRefereeStatus(id);
        setIsReferee(result.isReferee);
        setPermissions(result.permissions);
        if (!result.isReferee) {
          setError(t('competition.referee.notAuthorized', 'You are not authorized as a referee for this competition'));
          setIsLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to check referee status'));
        setIsLoading(false);
      }
    };
    checkRefereeStatus();
  }, [id, t]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!id || !isReferee) return;
    try {
      const compData = await competitionApi.get(id);
      setCompetition({
        _id: compData._id,
        name: compData.name,
        status: compData.status,
        currentQuestionIndex: compData.currentQuestionIndex,
        participantCount: compData.participantCount,
        settings: compData.settings,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch competition data'));
    } finally {
      setIsLoading(false);
    }
  }, [id, isReferee, t]);

  // Fetch submissions for current question
  const fetchSubmissions = useCallback(async (questionId: string) => {
    if (!id) return;
    try {
      const subs = await competitionApi.getQuestionSubmissions(id, questionId);
      setSubmissions(subs);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    }
  }, [id]);

  // Socket connection using the new connectAsReferee function
  useEffect(() => {
    if (!isReferee || !id) return;
    fetchData();

    let isMounted = true;

    const connect = async () => {
      try {
        const result = await connectAsReferee(id);

        if (!isMounted) return;

        // Set initial data from connection result
        setCompetition({
          _id: result.competition.id,
          name: result.competition.name,
          status: result.competition.status,
          currentQuestionIndex: result.competition.currentQuestionIndex,
          participantCount: result.competition.participantCount,
          settings: result.competition.settings as Competition['settings'],
        });

        setQuestions(result.questions as unknown as Question[]);
        setPermissions(result.permissions as RefereePermission[]);

        // Set current question
        if (result.questions.length > 0 && result.competition.currentQuestionIndex >= 0) {
          const current = result.questions[result.competition.currentQuestionIndex] as unknown as Question;
          setCurrentQuestion(current);
          if (current) {
            fetchSubmissions(current.id);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : t('error.connectionFailed', 'Connection failed'));
        }
      }
    };

    connect();

    // Set up additional event listeners for referee-specific events
    const cleanups: (() => void)[] = [];

    // Question changed
    cleanups.push(onSocketEvent('question:show', (data: { questionId: string; order: number; content: string; type: string; options?: Question['options']; timeLimit: number; points: number }) => {
      const question: Question = {
        id: data.questionId,
        order: data.order,
        content: data.content,
        type: data.type,
        options: data.options,
        timeLimit: data.timeLimit,
        points: data.points,
        status: 'active',
      };
      setCurrentQuestion(question);
      setCompetition(prev => prev ? { ...prev, currentQuestionIndex: data.order } : null);
      fetchSubmissions(data.questionId);
    }));

    // Submission events
    cleanups.push(onSocketEvent('submission:new', (data: { submission: Submission }) => {
      setSubmissions(prev => {
        const exists = prev.some(s => s._id === data.submission._id);
        if (exists) {
          return prev.map(s => s._id === data.submission._id ? data.submission : s);
        }
        return [...prev, data.submission];
      });
    }));

    cleanups.push(onSocketEvent('submission:updated', (data: { submission: Submission }) => {
      setSubmissions(prev => prev.map(s => s._id === data.submission._id ? data.submission : s));
    }));

    // Timer events - backend sends milliseconds, convert to seconds for display
    cleanups.push(onSocketEvent('timer:tick', (data: { remainingTime: number }) => {
      setTimerState(prev => ({ ...prev, remainingTime: Math.ceil(data.remainingTime / 1000), isRunning: true }));
    }));

    cleanups.push(onSocketEvent('timer:started', (data: { totalDuration: number; remainingTime: number }) => {
      setTimerState({
        totalDuration: Math.ceil(data.totalDuration / 1000),
        remainingTime: Math.ceil(data.remainingTime / 1000),
        isRunning: true,
      });
    }));

    cleanups.push(onSocketEvent('timer:paused', (data: { remainingTime: number }) => {
      setTimerState(prev => ({ ...prev, remainingTime: Math.ceil(data.remainingTime / 1000), isRunning: false }));
    }));

    cleanups.push(onSocketEvent('timer:resumed', (data: { remainingTime: number }) => {
      setTimerState(prev => ({ ...prev, remainingTime: Math.ceil(data.remainingTime / 1000), isRunning: true }));
    }));

    cleanups.push(onSocketEvent('timer:ended', () => {
      setTimerState(prev => ({ ...prev, remainingTime: 0, isRunning: false }));
    }));

    // Competition status events
    cleanups.push(onSocketEvent('competition:started', () => {
      setCompetition(prev => prev ? { ...prev, status: 'ongoing' } : null);
    }));

    cleanups.push(onSocketEvent('competition:paused', () => {
      setCompetition(prev => prev ? { ...prev, status: 'paused' } : null);
    }));

    cleanups.push(onSocketEvent('competition:resumed', () => {
      setCompetition(prev => prev ? { ...prev, status: 'ongoing' } : null);
    }));

    cleanups.push(onSocketEvent('competition:ended', () => {
      setCompetition(prev => prev ? { ...prev, status: 'finished' } : null);
    }));

    // Answer revealed
    cleanups.push(onSocketEvent('answer:revealed', (data: { questionId: string; correctAnswer: string | string[] }) => {
      setCurrentQuestion(prev => prev ? { ...prev, correctAnswer: data.correctAnswer } : null);
    }));

    return () => {
      isMounted = false;
      cleanups.forEach(cleanup => cleanup());
      disconnectSocket();
    };
  }, [id, isReferee, fetchData, fetchSubmissions, t]);

  // Handle override score
  const handleOverrideScore = async () => {
    if (!id || !selectedSubmission) return;

    const newScore = parseInt(overrideScore);
    if (isNaN(newScore) || newScore < 0) {
      return;
    }

    setIsOverriding(true);
    try {
      await competitionApi.overrideScore(id, selectedSubmission._id, newScore, overrideComment || undefined);

      // Update local state
      setSubmissions(prev => prev.map(s => {
        if (s._id === selectedSubmission._id) {
          return {
            ...s,
            score: newScore,
            refereeOverride: {
              overriddenBy: 'current-user',
              originalScore: s.score,
              newScore,
              comment: overrideComment,
              overriddenAt: new Date().toISOString(),
            },
          };
        }
        return s;
      }));

      setShowOverrideModal(false);
      setSelectedSubmission(null);
      setOverrideScore('');
      setOverrideComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.updateFailed', 'Failed to override score'));
    } finally {
      setIsOverriding(false);
    }
  };

  // Handle manual judge
  const handleManualJudge = async (submission: Submission, isCorrect: boolean) => {
    if (!id) return;

    setIsJudging(true);
    try {
      await competitionApi.manualJudge(id, submission._id, isCorrect);

      // Update local state
      const basePoints = competition?.settings.basePoints || 100;
      setSubmissions(prev => prev.map(s => {
        if (s._id === submission._id) {
          return {
            ...s,
            isCorrect,
            score: isCorrect ? basePoints : 0,
          };
        }
        return s;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.updateFailed', 'Failed to judge submission'));
    } finally {
      setIsJudging(false);
    }
  };

  // Format time display (timerState.remainingTime is already in seconds)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check permissions
  const hasPermission = (permission: RefereePermission): boolean => {
    return permissions.includes(permission);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  if (error && !isReferee) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <GlassCard className="p-8 text-center">
          <div className="mb-4 text-6xl">&#128683;</div>
          <h2 className="mb-2 text-xl font-bold text-[var(--color-error)]">
            {t('competition.referee.accessDenied', 'Access Denied')}
          </h2>
          <p className="mb-6 text-[var(--color-muted)]">{error}</p>
          <Button onClick={() => navigate('/competitions')}>
            {t('common.back', 'Go Back')}
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{competition?.name}</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {t('competition.referee.panel', 'Referee Control Panel')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Status Badge */}
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${
            competition?.status === 'ongoing'
              ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
              : competition?.status === 'paused'
              ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
              : 'bg-[var(--color-muted)]/20 text-[var(--color-muted)]'
          }`}>
            {t(`competition.status.${competition?.status}`, competition?.status || '')}
          </span>

          {/* Timer */}
          {timerState.isRunning && (
            <div className="rounded-lg bg-[var(--color-primary)]/10 px-4 py-2 font-mono text-xl font-bold text-[var(--color-primary)]">
              {formatTime(timerState.remainingTime)}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Question */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6">
            <h2 className="mb-4 text-lg font-semibold">
              {t('competition.referee.currentQuestion', 'Current Question')}
              {currentQuestion && (
                <span className="ml-2 text-[var(--color-muted)]">
                  #{currentQuestion.order}
                </span>
              )}
            </h2>

            {currentQuestion ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-[var(--color-card)] p-4">
                  <LaTeXRenderer content={currentQuestion.content} />
                </div>

                {currentQuestion.options && currentQuestion.options.length > 0 && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-3"
                      >
                        <span className="font-bold text-[var(--color-primary)]">{option.label}.</span>
                        <LaTeXRenderer content={option.content} />
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion.correctAnswer && (
                  <div className="rounded-lg bg-[var(--color-success)]/10 p-3">
                    <span className="font-medium text-[var(--color-success)]">
                      {t('competition.referee.correctAnswer', 'Correct Answer')}:
                    </span>
                    <span className="ml-2">
                      {Array.isArray(currentQuestion.correctAnswer)
                        ? currentQuestion.correctAnswer.join(', ')
                        : currentQuestion.correctAnswer}
                    </span>
                  </div>
                )}

                <div className="flex gap-4 text-sm text-[var(--color-muted)]">
                  <span>{t('competition.timeLimit', 'Time Limit')}: {currentQuestion.timeLimit}s</span>
                  <span>{t('competition.points', 'Points')}: {currentQuestion.points}</span>
                  <span>{t('problem.type.label', 'Type')}: {t(`problem.type.${currentQuestion.type}`, currentQuestion.type)}</span>
                </div>
              </div>
            ) : (
              <p className="text-center text-[var(--color-muted)]">
                {t('competition.referee.noQuestion', 'No question is currently active')}
              </p>
            )}
          </GlassCard>
        </div>

        {/* Stats */}
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('competition.referee.stats', 'Statistics')}</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{t('competition.participants', 'Participants')}</span>
              <span className="font-bold">{competition?.participantCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{t('competition.referee.submissions', 'Submissions')}</span>
              <span className="font-bold">{submissions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{t('competition.referee.correct', 'Correct')}</span>
              <span className="font-bold text-[var(--color-success)]">
                {submissions.filter(s => s.isCorrect).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{t('competition.referee.incorrect', 'Incorrect')}</span>
              <span className="font-bold text-[var(--color-error)]">
                {submissions.filter(s => !s.isCorrect).length}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Submissions List */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {t('competition.referee.submissionsList', 'Submissions')}
          <span className="ml-2 text-sm text-[var(--color-muted)]">({submissions.length})</span>
        </h2>

        {submissions.length === 0 ? (
          <p className="text-center text-[var(--color-muted)] py-8">
            {t('competition.referee.noSubmissions', 'No submissions yet for this question')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-sm text-[var(--color-muted)]">
                  <th className="pb-3 pr-4">{t('competition.referee.participant', 'Participant')}</th>
                  <th className="pb-3 pr-4">{t('competition.referee.answer', 'Answer')}</th>
                  <th className="pb-3 pr-4">{t('competition.referee.result', 'Result')}</th>
                  <th className="pb-3 pr-4">{t('competition.referee.score', 'Score')}</th>
                  <th className="pb-3 pr-4">{t('competition.referee.timeSpent', 'Time')}</th>
                  <th className="pb-3">{t('competition.referee.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr
                    key={submission._id}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <span className="font-medium">{submission.participantNickname}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <code className="rounded bg-[var(--color-card)] px-2 py-1 text-sm">
                        {submission.answer}
                      </code>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        submission.isCorrect
                          ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                          : 'bg-[var(--color-error)]/20 text-[var(--color-error)]'
                      }`}>
                        {submission.isCorrect
                          ? t('competition.referee.correct', 'Correct')
                          : t('competition.referee.incorrect', 'Incorrect')}
                      </span>
                      {submission.refereeOverride && (
                        <span className="ml-2 text-xs text-[var(--color-warning)]">
                          ({t('competition.referee.overridden', 'Overridden')})
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-bold">{submission.score}</span>
                      {submission.refereeOverride && (
                        <span className="ml-1 text-xs text-[var(--color-muted)] line-through">
                          {submission.refereeOverride.originalScore}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm text-[var(--color-muted)]">
                      {(submission.timeSpent / 1000).toFixed(1)}s
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {hasPermission('manual_judge') && (
                          <>
                            <button
                              onClick={() => handleManualJudge(submission, true)}
                              disabled={isJudging}
                              className="rounded p-1 text-[var(--color-success)] hover:bg-[var(--color-success)]/10 disabled:opacity-50"
                              title={t('competition.referee.markCorrect', 'Mark as Correct')}
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleManualJudge(submission, false)}
                              disabled={isJudging}
                              className="rounded p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 disabled:opacity-50"
                              title={t('competition.referee.markIncorrect', 'Mark as Incorrect')}
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                        {hasPermission('override_score') && (
                          <button
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setOverrideScore(submission.score.toString());
                              setShowOverrideModal(true);
                            }}
                            className="rounded p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                            title={t('competition.referee.overrideScore', 'Override Score')}
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Override Score Modal */}
      {showOverrideModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <GlassCard className="w-full max-w-md p-6">
            <h3 className="mb-4 text-lg font-semibold">
              {t('competition.referee.overrideScoreTitle', 'Override Score')}
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--color-muted)]">
                  {t('competition.referee.participant', 'Participant')}: {selectedSubmission.participantNickname}
                </p>
                <p className="text-sm text-[var(--color-muted)]">
                  {t('competition.referee.currentScore', 'Current Score')}: {selectedSubmission.score}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  {t('competition.referee.newScore', 'New Score')}
                </label>
                <Input
                  type="number"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                  min={0}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  {t('competition.referee.comment', 'Comment')} ({t('common.optional', 'Optional')})
                </label>
                <Input
                  type="text"
                  value={overrideComment}
                  onChange={(e) => setOverrideComment(e.target.value)}
                  placeholder={t('competition.referee.commentPlaceholder', 'Reason for override...')}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOverrideModal(false);
                    setSelectedSubmission(null);
                  }}
                  className="flex-1"
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={handleOverrideScore}
                  disabled={isOverriding || !overrideScore}
                  className="flex-1"
                >
                  {isOverriding ? (
                    <IconLoading size={16} state="loading" />
                  ) : (
                    t('common.confirm', 'Confirm')
                  )}
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
