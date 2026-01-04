import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import {
  type CompetitionDisplaySettings,
  type CustomThemeColors,
  getThemeColors,
} from '@/types/competition';
import {
  verifyAnswer,
  type VerificationResult,
  type QuestionType,
} from '@/services/mathVerification';

interface MockQuestion {
  id: string;
  number: number;
  contentKey?: string; // i18n key for content
  content: string;
  type: 'choice' | 'blank' | 'answer' | 'integral';
  options?: Array<{ id: string; label: string; content: string }>;
  correctAnswer: string;
  integrand?: string; // For integral questions: the expression being integrated
  points: number;
  hintKey?: string; // i18n key for hint
  hint?: string;
}

interface CompetitionPreviewProps {
  settings: CompetitionDisplaySettings;
  isSimulating?: boolean;
  onSimulationEnd?: () => void;
  className?: string;
}

// Base mock questions with translation keys
const BASE_MOCK_QUESTIONS: MockQuestion[] = [
  // 1. Basic integral (choice)
  {
    id: '1',
    number: 1,
    content: '$\\int x^2 \\, dx = ?$',
    type: 'choice',
    options: [
      { id: 'a', label: 'A', content: '$\\frac{x^3}{3} + C$' },
      { id: 'b', label: 'B', content: '$2x + C$' },
      { id: 'c', label: 'C', content: '$x^3 + C$' },
      { id: 'd', label: 'D', content: '$\\frac{x^2}{2} + C$' },
    ],
    correctAnswer: 'a',
    points: 100,
  },
  // 2. Famous limit (fill in blank)
  {
    id: '2',
    number: 2,
    content: '$\\displaystyle\\lim_{x \\to 0} \\frac{\\sin x}{x} = ?$',
    type: 'blank',
    correctAnswer: '1',
    points: 100,
    hintKey: 'competition.mockQuestions.hint1',
  },
  // 3. Fun arithmetic
  {
    id: '3',
    number: 3,
    contentKey: 'competition.mockQuestions.q3',
    content: '',
    type: 'blank',
    correctAnswer: '8',
    points: 80,
  },
  // 4. Famous series (choice)
  {
    id: '4',
    number: 4,
    content: '$\\displaystyle\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = ?$',
    type: 'choice',
    options: [
      { id: 'a', label: 'A', content: '$\\frac{\\pi^2}{6}$' },
      { id: 'b', label: 'B', content: '$\\pi$' },
      { id: 'c', label: 'C', content: '$\\frac{\\pi}{2}$' },
      { id: 'd', label: 'D', content: '$1$' },
    ],
    correctAnswer: 'a',
    points: 120,
  },
  // 5. Indefinite integral - verify by differentiation
  {
    id: '5',
    number: 5,
    contentKey: 'competition.mockQuestions.q5',
    content: '',
    type: 'integral',
    correctAnswer: '-cos(x)',
    integrand: 'sin(x)',
    points: 150,
    hintKey: 'competition.mockQuestions.hint2',
  },
  // 6. Expression equivalence test
  {
    id: '6',
    number: 6,
    contentKey: 'competition.mockQuestions.q6',
    content: '',
    type: 'blank',
    correctAnswer: 'a/2',
    points: 80,
    hintKey: 'competition.mockQuestions.hint3',
  },
  // 7. Fun problem - age puzzle
  {
    id: '7',
    number: 7,
    contentKey: 'competition.mockQuestions.q7',
    content: '',
    type: 'blank',
    correctAnswer: '24',
    points: 100,
    hintKey: 'competition.mockQuestions.hint4',
  },
  // 8. Derivative
  {
    id: '8',
    number: 8,
    contentKey: 'competition.mockQuestions.q8',
    content: '',
    type: 'blank',
    correctAnswer: '3*x^2+2',
    points: 100,
  },
  // 9. Quadratic equation
  {
    id: '9',
    number: 9,
    contentKey: 'competition.mockQuestions.q9',
    content: '',
    type: 'blank',
    correctAnswer: '5',
    points: 80,
  },
  // 10. Fun problem - handshakes
  {
    id: '10',
    number: 10,
    contentKey: 'competition.mockQuestions.q10',
    content: '',
    type: 'blank',
    correctAnswer: '28',
    points: 120,
    hintKey: 'competition.mockQuestions.hint8',
  },
  // 11. Another integral
  {
    id: '11',
    number: 11,
    contentKey: 'competition.mockQuestions.q11',
    content: '',
    type: 'integral',
    correctAnswer: 'e^x',
    integrand: 'e^x',
    points: 100,
    hintKey: 'competition.mockQuestions.hint5',
  },
  // 12. Probability
  {
    id: '12',
    number: 12,
    contentKey: 'competition.mockQuestions.q12',
    content: '',
    type: 'blank',
    correctAnswer: '1/6',
    points: 150,
  },
  // 13. Geometry - circle
  {
    id: '13',
    number: 13,
    contentKey: 'competition.mockQuestions.q13',
    content: '',
    type: 'choice',
    options: [
      { id: 'a', label: 'A', content: '$\\pi r^2$' },
      { id: 'b', label: 'B', content: '$2\\pi r$' },
      { id: 'c', label: 'C', content: '$\\pi r$' },
      { id: 'd', label: 'D', content: '$4\\pi r^2$' },
    ],
    correctAnswer: 'a',
    points: 60,
  },
  // 14. Fun problem - sequence
  {
    id: '14',
    number: 14,
    contentKey: 'competition.mockQuestions.q14',
    content: '',
    type: 'blank',
    correctAnswer: '21',
    points: 80,
    hintKey: 'competition.mockQuestions.hint6',
  },
  // 15. Complex integral
  {
    id: '15',
    number: 15,
    contentKey: 'competition.mockQuestions.q15',
    content: '',
    type: 'integral',
    correctAnswer: 'e^(x^2)',
    integrand: '2*x*e^(x^2)',
    points: 200,
    hintKey: 'competition.mockQuestions.hint7',
  },
];

// Answer status for each question
interface AnswerState {
  answer: string;
  submitted: boolean;
  result?: VerificationResult;
  isVerifying: boolean;
}

export function CompetitionPreview({
  settings,
  isSimulating = false,
  onSimulationEnd,
  className,
}: CompetitionPreviewProps) {
  const { t } = useTranslation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

  const colors = getThemeColors(settings.theme);

  // Translate mock questions based on current language
  const MOCK_QUESTIONS = useMemo(() => {
    return BASE_MOCK_QUESTIONS.map(q => ({
      ...q,
      content: q.contentKey ? t(q.contentKey, q.content) : q.content,
      hint: q.hintKey ? t(q.hintKey, { defaultValue: q.hint || '' }) : q.hint,
    }));
  }, [t]);

  // Initialize answers state
  useEffect(() => {
    const initialAnswers: Record<string, AnswerState> = {};
    MOCK_QUESTIONS.forEach((q) => {
      initialAnswers[q.id] = {
        answer: '',
        submitted: false,
        isVerifying: false,
      };
    });
    setAnswers(initialAnswers);
  }, []);

  // Simulation timer
  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
            setCurrentQuestionIndex((i) => i + 1);
            return 60;
          } else {
            clearInterval(timer);
            onSimulationEnd?.();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSimulating, currentQuestionIndex, onSimulationEnd]);

  // Update answer for a question
  const updateAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer,
        submitted: false,
        result: undefined,
      },
    }));
  }, []);

  // Submit answer for verification
  const submitAnswer = useCallback(async (question: MockQuestion) => {
    const answerState = answers[question.id];
    if (!answerState?.answer || answerState.isVerifying) return;

    // Set verifying state
    setAnswers((prev) => ({
      ...prev,
      [question.id]: {
        ...prev[question.id],
        isVerifying: true,
      },
    }));

    try {
      const result = await verifyAnswer(
        answerState.answer,
        question.correctAnswer,
        question.type as QuestionType,
        question.integrand
      );

      setAnswers((prev) => ({
        ...prev,
        [question.id]: {
          ...prev[question.id],
          submitted: true,
          result,
          isVerifying: false,
        },
      }));
    } catch (error) {
      console.error('Verification error:', error);
      setAnswers((prev) => ({
        ...prev,
        [question.id]: {
          ...prev[question.id],
          isVerifying: false,
        },
      }));
    }
  }, [answers]);

  // Get questions to display based on layout
  const getVisibleQuestions = (): MockQuestion[] => {
    if (settings.layout === 'single') {
      return [MOCK_QUESTIONS[currentQuestionIndex]];
    }
    return MOCK_QUESTIONS.slice(0, settings.questionsPerPage);
  };

  const visibleQuestions = getVisibleQuestions();
  const progress = ((currentQuestionIndex + 1) / MOCK_QUESTIONS.length) * 100;

  return (
    <div
      className={cn('overflow-hidden rounded-2xl border shadow-lg', className)}
      style={{
        backgroundColor: colors.background,
        borderColor: colors.secondary,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: colors.primary }}
      >
        <h2 className="text-xl font-bold text-white">
          {t('competition.sampleTitle', 'Sample Competition')}
        </h2>
        {settings.showTimer && (
          <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2">
            <TimerIcon className="h-5 w-5 text-white" />
            <span className="font-mono text-lg font-bold text-white">
              {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:
              {String(timeRemaining % 60).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {settings.showProgress && (
        <div
          className="h-1"
          style={{ backgroundColor: colors.secondary + '40' }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: colors.accent,
            }}
          />
        </div>
      )}

      {/* Content area */}
      <div className="p-6">
        {settings.layout === 'single' && (
          <SingleQuestionLayout
            question={visibleQuestions[0]}
            colors={colors}
            settings={settings}
            answerState={answers[visibleQuestions[0]?.id]}
            onAnswerChange={(answer) => updateAnswer(visibleQuestions[0].id, answer)}
            onSubmit={() => submitAnswer(visibleQuestions[0])}
          />
        )}

        {settings.layout === 'grid' && (
          <GridQuestionLayout
            questions={visibleQuestions}
            colors={colors}
            settings={settings}
            answers={answers}
            onAnswerChange={updateAnswer}
            onSubmit={submitAnswer}
          />
        )}

        {settings.layout === 'list' && (
          <ListQuestionLayout
            questions={visibleQuestions}
            colors={colors}
            settings={settings}
            answers={answers}
            onAnswerChange={updateAnswer}
            onSubmit={submitAnswer}
          />
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between border-t px-6 py-4"
        style={{ borderColor: colors.secondary + '40' }}
      >
        <span className="text-sm" style={{ color: colors.text + '80' }}>
          {settings.showQuestionNumber &&
            t('competition.questionOf', 'Question {{current}} of {{total}}', {
              current: currentQuestionIndex + 1,
              total: MOCK_QUESTIONS.length,
            })}
        </span>
        <span className="text-sm font-medium" style={{ color: colors.accent }}>
          {visibleQuestions[0]?.points || 100} {t('competition.points', 'pts')}
        </span>
      </div>
    </div>
  );
}

// Single question layout with answer input
function SingleQuestionLayout({
  question,
  colors,
  settings,
  answerState,
  onAnswerChange,
  onSubmit,
}: {
  question: MockQuestion;
  colors: CustomThemeColors;
  settings: CompetitionDisplaySettings;
  answerState?: AnswerState;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();

  if (!question) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-6">
      {/* Question number and content */}
      <div className="text-center">
        {settings.showQuestionNumber && (
          <div
            className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold"
            style={{
              backgroundColor: colors.primary + '20',
              color: colors.primary,
            }}
          >
            {question.number}
          </div>
        )}
        <LaTeXRenderer
          content={question.content}
          className="text-2xl font-medium"
          style={{ color: colors.text }}
        />
        {question.hint && (
          <p className="mt-2 text-sm" style={{ color: colors.text + '60' }}>
            {question.hint}
          </p>
        )}
      </div>

      {/* Choice options */}
      {question.type === 'choice' && question.options && (
        <div className="grid gap-3 md:grid-cols-2">
          {question.options.map((option) => {
            const isSelected = answerState?.answer === option.id;
            const isSubmitted = answerState?.submitted;
            const isCorrect = isSubmitted && answerState?.result?.isCorrect && isSelected;
            const isWrong = isSubmitted && !answerState?.result?.isCorrect && isSelected;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onAnswerChange(option.id);
                  // Auto-submit for choice questions
                  setTimeout(() => onSubmit(), 100);
                }}
                disabled={isSubmitted}
                className="flex items-center gap-3 rounded-xl p-4 text-left transition-all"
                style={{
                  backgroundColor: isCorrect
                    ? '#22c55e20'
                    : isWrong
                    ? '#ef444420'
                    : isSelected
                    ? colors.accent + '20'
                    : colors.secondary + '30',
                  borderLeft: `4px solid ${
                    isCorrect
                      ? '#22c55e'
                      : isWrong
                      ? '#ef4444'
                      : isSelected
                      ? colors.accent
                      : 'transparent'
                  }`,
                  opacity: isSubmitted && !isSelected ? 0.6 : 1,
                }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                  style={{
                    backgroundColor: isCorrect
                      ? '#22c55e'
                      : isWrong
                      ? '#ef4444'
                      : isSelected
                      ? colors.accent
                      : colors.secondary,
                    color: isSelected || isCorrect || isWrong ? '#fff' : colors.text,
                  }}
                >
                  {isCorrect ? '✓' : isWrong ? '✗' : option.label}
                </span>
                <LaTeXRenderer content={option.content} style={{ color: colors.text }} />
              </button>
            );
          })}
        </div>
      )}

      {/* Fill in blank / Answer / Integral input */}
      {(question.type === 'blank' || question.type === 'answer' || question.type === 'integral') && (
        <div className="space-y-4">
          <div className="mx-auto max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={answerState?.answer || ''}
                onChange={(e) => onAnswerChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  question.type === 'integral'
                    ? t('competition.enterIntegral', 'Enter antiderivative (without +C)')
                    : t('competition.enterAnswer', 'Enter your answer')
                }
                disabled={answerState?.submitted}
                className="w-full rounded-xl border-2 p-4 pr-24 text-center text-lg transition-all"
                style={{
                  borderColor: answerState?.submitted
                    ? answerState?.result?.isCorrect
                      ? '#22c55e'
                      : '#ef4444'
                    : colors.secondary,
                  backgroundColor: colors.background,
                  color: colors.text,
                }}
              />
              <button
                onClick={onSubmit}
                disabled={!answerState?.answer || answerState?.submitted || answerState?.isVerifying}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: colors.primary }}
              >
                {answerState?.isVerifying ? (
                  <LoadingSpinner className="h-5 w-5" />
                ) : answerState?.submitted ? (
                  answerState?.result?.isCorrect ? '✓' : '✗'
                ) : (
                  t('common.submit', 'Submit')
                )}
              </button>
            </div>
          </div>

          {/* Result feedback */}
          {answerState?.submitted && answerState?.result && (
            <div
              className="mx-auto max-w-xl rounded-xl p-4 text-center"
              style={{
                backgroundColor: answerState.result.isCorrect ? '#22c55e15' : '#ef444415',
                color: answerState.result.isCorrect ? '#22c55e' : '#ef4444',
              }}
            >
              {answerState.result.isCorrect ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckIcon className="h-5 w-5" />
                  <span className="font-medium">{t('competition.correct', 'Correct!')}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <XIcon className="h-5 w-5" />
                    <span className="font-medium">{t('competition.incorrect', 'Incorrect')}</span>
                  </div>
                  <p className="text-sm opacity-80">
                    {t('competition.correctAnswerIs', 'Correct answer')}: <LaTeXRenderer content={`$${question.correctAnswer}$`} className="inline" />
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Grid question layout
function GridQuestionLayout({
  questions,
  colors,
  settings,
  answers,
  onAnswerChange,
  onSubmit,
}: {
  questions: MockQuestion[];
  colors: CustomThemeColors;
  settings: CompetitionDisplaySettings;
  answers: Record<string, AnswerState>;
  onAnswerChange: (id: string, answer: string) => void;
  onSubmit: (question: MockQuestion) => void;
}) {
  const columns = questions.length <= 2 ? 2 : questions.length <= 4 ? 2 : 3;

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          colors={colors}
          settings={settings}
          answerState={answers[question.id]}
          onAnswerChange={(answer) => onAnswerChange(question.id, answer)}
          onSubmit={() => onSubmit(question)}
        />
      ))}
    </div>
  );
}

// List question layout
function ListQuestionLayout({
  questions,
  colors,
  settings,
  answers,
  onAnswerChange,
  onSubmit,
}: {
  questions: MockQuestion[];
  colors: CustomThemeColors;
  settings: CompetitionDisplaySettings;
  answers: Record<string, AnswerState>;
  onAnswerChange: (id: string, answer: string) => void;
  onSubmit: (question: MockQuestion) => void;
}) {
  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          colors={colors}
          settings={settings}
          answerState={answers[question.id]}
          onAnswerChange={(answer) => onAnswerChange(question.id, answer)}
          onSubmit={() => onSubmit(question)}
          horizontal
        />
      ))}
    </div>
  );
}

// Question card for grid/list layouts with answer input
function QuestionCard({
  question,
  colors,
  settings,
  answerState,
  onAnswerChange,
  onSubmit,
  horizontal = false,
}: {
  question: MockQuestion;
  colors: CustomThemeColors;
  settings: CompetitionDisplaySettings;
  answerState?: AnswerState;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  horizontal?: boolean;
}) {
  const { t } = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  const resultColor = answerState?.submitted
    ? answerState?.result?.isCorrect
      ? '#22c55e'
      : '#ef4444'
    : undefined;

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        horizontal && 'flex items-start gap-4'
      )}
      style={{
        borderColor: resultColor || colors.secondary + '40',
        backgroundColor: resultColor ? resultColor + '10' : colors.secondary + '10',
      }}
    >
      {settings.showQuestionNumber && (
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
            !horizontal && 'mb-3'
          )}
          style={{
            backgroundColor: colors.primary,
            color: '#fff',
          }}
        >
          {question.number}
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-3">
        <LaTeXRenderer
          content={question.content}
          className="text-sm"
          style={{ color: colors.text }}
        />

        {/* Answer input */}
        {question.type !== 'choice' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={answerState?.answer || ''}
              onChange={(e) => onAnswerChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('competition.answer', 'Answer')}
              disabled={answerState?.submitted}
              className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
              style={{
                borderColor: colors.secondary,
                backgroundColor: colors.background,
                color: colors.text,
              }}
            />
            <button
              onClick={onSubmit}
              disabled={!answerState?.answer || answerState?.submitted}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: colors.primary }}
            >
              {answerState?.isVerifying ? '...' : answerState?.submitted ? (answerState?.result?.isCorrect ? '✓' : '✗') : t('common.ok', 'OK')}
            </button>
          </div>
        )}

        {/* Choice options for grid/list */}
        {question.type === 'choice' && question.options && (
          <div className="flex flex-wrap gap-2">
            {question.options.map((option) => {
              const isSelected = answerState?.answer === option.id;
              const isCorrect = answerState?.submitted && answerState?.result?.isCorrect && isSelected;
              const isWrong = answerState?.submitted && !answerState?.result?.isCorrect && isSelected;

              return (
                <button
                  key={option.id}
                  onClick={() => {
                    onAnswerChange(option.id);
                    setTimeout(() => onSubmit(), 100);
                  }}
                  disabled={answerState?.submitted}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    backgroundColor: isCorrect
                      ? '#22c55e'
                      : isWrong
                      ? '#ef4444'
                      : isSelected
                      ? colors.accent
                      : colors.secondary,
                    color: isSelected || isCorrect || isWrong ? '#fff' : colors.text,
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-xs"
            style={{
              backgroundColor: colors.accent + '20',
              color: colors.accent,
            }}
          >
            {question.type === 'choice' && t('problem.type.choice', 'Choice')}
            {question.type === 'blank' && t('problem.type.blank', 'Fill-in')}
            {question.type === 'answer' && t('problem.type.answer', 'Answer')}
            {question.type === 'integral' && t('problem.type.integral', 'Integral')}
          </span>
          <span className="text-xs" style={{ color: colors.text + '80' }}>
            {question.points} {t('competition.points', 'pts')}
          </span>
        </div>
      </div>
    </div>
  );
}

// Icons
function TimerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
