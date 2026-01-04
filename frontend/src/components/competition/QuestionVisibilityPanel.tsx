import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import type { QuestionDisplayState } from '@/types/competition';

interface CompetitionQuestion {
  _id: string;
  order: number;
  content: string;
  type: string;
  points: number;
}

interface QuestionVisibilityPanelProps {
  questions: CompetitionQuestion[];
  visibilityStates: QuestionDisplayState[];
  onVisibilityChange: (states: QuestionDisplayState[]) => void;
  onReorder?: (states: QuestionDisplayState[]) => void;
  onPointsChange?: (questionId: string, points: number) => void;
  className?: string;
  readOnly?: boolean;
}

export function QuestionVisibilityPanel({
  questions,
  visibilityStates,
  onVisibilityChange,
  onReorder,
  onPointsChange,
  className,
  readOnly = false,
}: QuestionVisibilityPanelProps) {
  const { t } = useTranslation();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingPointsId, setEditingPointsId] = useState<string | null>(null);
  const [editingPointsValue, setEditingPointsValue] = useState<string>('');

  // Get visibility state for a question
  const getVisibility = useCallback(
    (questionId: string): boolean => {
      const state = visibilityStates.find((s) => s.questionId === questionId);
      return state?.visible ?? true;
    },
    [visibilityStates]
  );

  // Get order for a question
  const getOrder = useCallback(
    (questionId: string, defaultOrder: number): number => {
      const state = visibilityStates.find((s) => s.questionId === questionId);
      return state?.order ?? defaultOrder;
    },
    [visibilityStates]
  );

  // Sort questions by order
  const sortedQuestions = [...questions].sort((a, b) => {
    const orderA = getOrder(a._id, a.order);
    const orderB = getOrder(b._id, b.order);
    return orderA - orderB;
  });

  // Toggle visibility for a single question
  const handleToggleVisibility = (questionId: string) => {
    if (readOnly) return;

    const newStates = visibilityStates.map((state) =>
      state.questionId === questionId
        ? { ...state, visible: !state.visible }
        : state
    );

    // If the question doesn't have a state, add it
    if (!visibilityStates.find((s) => s.questionId === questionId)) {
      const question = questions.find((q) => q._id === questionId);
      if (question) {
        newStates.push({
          questionId,
          visible: false,
          order: question.order,
        });
      }
    }

    onVisibilityChange(newStates);
  };

  // Show all questions
  const handleShowAll = () => {
    if (readOnly) return;
    const newStates = questions.map((q) => ({
      questionId: q._id,
      visible: true,
      order: getOrder(q._id, q.order),
    }));
    onVisibilityChange(newStates);
  };

  // Hide all questions
  const handleHideAll = () => {
    if (readOnly) return;
    const newStates = questions.map((q) => ({
      questionId: q._id,
      visible: false,
      order: getOrder(q._id, q.order),
    }));
    onVisibilityChange(newStates);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    if (readOnly || !onReorder) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (readOnly || !onReorder || draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (readOnly || !onReorder || draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const newSortedQuestions = [...sortedQuestions];
    const [draggedQuestion] = newSortedQuestions.splice(draggedIndex, 1);
    newSortedQuestions.splice(targetIndex, 0, draggedQuestion);

    const newStates = newSortedQuestions.map((q, index) => ({
      questionId: q._id,
      visible: getVisibility(q._id),
      order: index + 1,
    }));

    onReorder(newStates);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Start editing points
  const handleStartEditPoints = (questionId: string, currentPoints: number) => {
    if (readOnly || !onPointsChange) return;
    setEditingPointsId(questionId);
    setEditingPointsValue(currentPoints.toString());
  };

  // Save points
  const handleSavePoints = (questionId: string) => {
    if (!onPointsChange) return;
    const newPoints = parseInt(editingPointsValue, 10);
    if (!isNaN(newPoints) && newPoints >= 0) {
      onPointsChange(questionId, newPoints);
    }
    setEditingPointsId(null);
    setEditingPointsValue('');
  };

  // Cancel editing
  const handleCancelEditPoints = () => {
    setEditingPointsId(null);
    setEditingPointsValue('');
  };

  // Handle key press in points input
  const handlePointsKeyDown = (e: React.KeyboardEvent, questionId: string) => {
    if (e.key === 'Enter') {
      handleSavePoints(questionId);
    } else if (e.key === 'Escape') {
      handleCancelEditPoints();
    }
  };

  // Get visible and hidden counts
  const visibleCount = sortedQuestions.filter((q) => getVisibility(q._id)).length;
  const hiddenCount = sortedQuestions.length - visibleCount;

  // Truncate content for preview
  const truncateContent = (content: string, maxLength: number = 50): string => {
    // Remove LaTeX and HTML tags for preview
    const plainText = content
      .replace(/\$[^$]+\$/g, '[Math]')
      .replace(/<[^>]+>/g, '')
      .trim();
    return plainText.length > maxLength
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
  };

  return (
    <GlassCard className={cn('p-4', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('competition.questionControl', 'Question Control')}
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--color-muted)]">
            {t('competition.visibleCount', '{{count}} visible', { count: visibleCount })}
          </span>
          <span className="text-[var(--color-muted)]">/</span>
          <span className="text-[var(--color-muted)]">
            {t('competition.hiddenCount', '{{count}} hidden', { count: hiddenCount })}
          </span>
        </div>
      </div>

      {/* Batch actions */}
      {!readOnly && (
        <div className="mb-4 flex gap-2">
          <Button size="sm" variant="outline" onClick={handleShowAll}>
            <EyeIcon className="mr-1.5 h-4 w-4" />
            {t('competition.showAll', 'Show All')}
          </Button>
          <Button size="sm" variant="outline" onClick={handleHideAll}>
            <EyeOffIcon className="mr-1.5 h-4 w-4" />
            {t('competition.hideAll', 'Hide All')}
          </Button>
        </div>
      )}

      {/* Question list */}
      <div className="space-y-2">
        {sortedQuestions.map((question, index) => {
          const isVisible = getVisibility(question._id);
          const isDragging = draggedIndex === index;

          return (
            <div
              key={question._id}
              draggable={!readOnly && !!onReorder}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 transition-all',
                isVisible
                  ? 'border-[var(--color-border)] bg-[var(--color-card)]'
                  : 'border-dashed border-[var(--color-muted)]/50 bg-[var(--color-secondary)]/30 opacity-60',
                isDragging && 'opacity-50',
                !readOnly && onReorder && 'cursor-grab active:cursor-grabbing'
              )}
            >
              {/* Drag handle */}
              {!readOnly && onReorder && (
                <div className="flex flex-col gap-0.5 text-[var(--color-muted)]">
                  <div className="h-0.5 w-4 rounded bg-current" />
                  <div className="h-0.5 w-4 rounded bg-current" />
                  <div className="h-0.5 w-4 rounded bg-current" />
                </div>
              )}

              {/* Order number */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                  isVisible
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-muted)]/30 text-[var(--color-muted)]'
                )}
              >
                {index + 1}
              </div>

              {/* Question info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-xs font-medium',
                      question.type === 'choice'
                        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        : question.type === 'blank'
                        ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                    )}
                  >
                    {question.type === 'choice'
                      ? t('problem.type.choice', 'Choice')
                      : question.type === 'blank'
                      ? t('problem.type.blank', 'Fill-in')
                      : t('problem.type.answer', 'Answer')}
                  </span>
                  {/* Points display / edit */}
                  {editingPointsId === question._id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editingPointsValue}
                        onChange={(e) => setEditingPointsValue(e.target.value)}
                        onKeyDown={(e) => handlePointsKeyDown(e, question._id)}
                        onBlur={() => handleSavePoints(question._id)}
                        className="w-16 rounded border border-[var(--color-primary)] bg-[var(--color-card)] px-2 py-0.5 text-xs focus:outline-none"
                        min="0"
                        autoFocus
                      />
                      <span className="text-xs text-[var(--color-muted)]">{t('competition.points', 'pts')}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartEditPoints(question._id, question.points)}
                      disabled={readOnly || !onPointsChange}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-xs text-[var(--color-muted)] transition-colors',
                        !readOnly && onPointsChange && 'cursor-pointer hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]',
                        (readOnly || !onPointsChange) && 'cursor-default'
                      )}
                      title={!readOnly && onPointsChange ? t('competition.clickToEditPoints', 'Click to edit points') : undefined}
                    >
                      {question.points} {t('competition.points', 'pts')}
                      {!readOnly && onPointsChange && (
                        <EditIcon className="ml-1 inline-block h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
                <p
                  className={cn(
                    'mt-1 truncate text-sm',
                    isVisible ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted)]'
                  )}
                >
                  {truncateContent(question.content)}
                </p>
              </div>

              {/* Visibility toggle */}
              <button
                type="button"
                onClick={() => handleToggleVisibility(question._id)}
                disabled={readOnly}
                className={cn(
                  'shrink-0 rounded-lg p-2 transition-all',
                  isVisible
                    ? 'text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-muted)]/10',
                  readOnly && 'cursor-not-allowed opacity-50'
                )}
              >
                {isVisible ? (
                  <EyeIcon className="h-5 w-5" />
                ) : (
                  <EyeOffIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {sortedQuestions.length === 0 && (
        <div className="py-8 text-center text-[var(--color-muted)]">
          {t('competition.noQuestions', 'No questions added yet')}
        </div>
      )}

      {/* Help text */}
      {!readOnly && onReorder && sortedQuestions.length > 1 && (
        <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
          {t('competition.dragToReorder', 'Drag to reorder questions')}
        </p>
      )}
    </GlassCard>
  );
}

// Eye icon component
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Eye off icon component
function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// Edit icon component
function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
