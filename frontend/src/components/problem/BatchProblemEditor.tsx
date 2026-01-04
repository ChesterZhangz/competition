import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';

export interface BatchProblem {
  id: string;
  type: 'choice' | 'fill-blank';
  difficulty: 'easy' | 'medium' | 'hard';
  content: string;
  options: Array<{ id: string; label: string; content: string }>;
  correctAnswer: string | string[];
  answerExplanation: string;
  source: string;
  points: number;
  estimatedTime: number;
}

interface BatchProblemEditorProps {
  problems: BatchProblem[];
  onProblemsChange: (problems: BatchProblem[]) => void;
  onEditProblem: (index: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

// SVG Icons
const Icons = {
  edit: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  delete: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  add: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  check: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  save: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function createEmptyProblem(): BatchProblem {
  return {
    id: generateId(),
    type: 'choice',
    difficulty: 'medium',
    content: '',
    options: [
      { id: 'A', label: 'A', content: '' },
      { id: 'B', label: 'B', content: '' },
      { id: 'C', label: 'C', content: '' },
      { id: 'D', label: 'D', content: '' },
    ],
    correctAnswer: '',
    answerExplanation: '',
    source: '',
    points: 10,
    estimatedTime: 60,
  };
}

export function BatchProblemEditor({
  problems,
  onProblemsChange,
  onEditProblem,
  onSubmit,
  isSubmitting,
}: BatchProblemEditorProps) {
  const { t } = useTranslation();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const handleAddProblem = () => {
    onProblemsChange([...problems, createEmptyProblem()]);
  };

  const handleDeleteProblem = (index: number) => {
    const newProblems = problems.filter((_, i) => i !== index);
    onProblemsChange(newProblems);
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.delete(problems[index].id);
      return next;
    });
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === problems.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(problems.map(p => p.id)));
    }
  };

  const handleBatchDelete = () => {
    const newProblems = problems.filter(p => !selectedRows.has(p.id));
    onProblemsChange(newProblems);
    setSelectedRows(new Set());
  };

  const handleBatchSetDifficulty = (difficulty: 'easy' | 'medium' | 'hard') => {
    const newProblems = problems.map(p =>
      selectedRows.has(p.id) ? { ...p, difficulty } : p
    );
    onProblemsChange(newProblems);
  };

  const handleBatchSetType = (type: 'choice' | 'fill-blank') => {
    const newProblems = problems.map(p =>
      selectedRows.has(p.id) ? { ...p, type } : p
    );
    onProblemsChange(newProblems);
  };

  const getDifficultyBadgeClass = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-[var(--color-success-bg)] text-[var(--color-success)]';
      case 'medium':
        return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]';
      case 'hard':
        return 'bg-[var(--color-error-bg)] text-[var(--color-error)]';
      default:
        return 'bg-[var(--color-secondary)] text-[var(--color-muted)]';
    }
  };

  const getTypeBadgeClass = (type: string) => {
    return type === 'choice'
      ? 'bg-[var(--color-info-bg)] text-[var(--color-info)]'
      : 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]';
  };

  const getAnswerDisplay = (problem: BatchProblem) => {
    if (problem.type === 'fill-blank') {
      return problem.correctAnswer as string || '-';
    }
    const answers = Array.isArray(problem.correctAnswer)
      ? problem.correctAnswer
      : [problem.correctAnswer];
    return answers.filter(Boolean).join(', ') || '-';
  };

  const isValid = problems.length > 0 && problems.every(p =>
    p.content.trim() &&
    (p.type === 'fill-blank' ? p.correctAnswer :
      (Array.isArray(p.correctAnswer) ? p.correctAnswer.length > 0 : p.correctAnswer))
  );

  return (
    <div className="space-y-4">
      {/* Batch actions bar */}
      {selectedRows.size > 0 && (
        <GlassCard className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[var(--color-muted)]">
              {t('problem.selectedCount', { count: selectedRows.size })}
            </span>
            <div className="flex gap-2">
              <select
                onChange={(e) => handleBatchSetDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-sm"
                defaultValue=""
              >
                <option value="" disabled>{t('problem.setDifficulty', 'Set Difficulty')}</option>
                <option value="easy">{t('problem.difficulty.easy', 'Easy')}</option>
                <option value="medium">{t('problem.difficulty.medium', 'Medium')}</option>
                <option value="hard">{t('problem.difficulty.hard', 'Hard')}</option>
              </select>
              <select
                onChange={(e) => handleBatchSetType(e.target.value as 'choice' | 'fill-blank')}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-sm"
                defaultValue=""
              >
                <option value="" disabled>{t('problem.setType', 'Set Type')}</option>
                <option value="choice">{t('problem.type.choice', 'Choice')}</option>
                <option value="fill-blank">{t('problem.type.fillBlank', 'Fill Blank')}</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBatchDelete}
                className="text-[var(--color-error)]"
              >
                {Icons.delete}
                <span className="ml-1">{t('problem.deleteSelected', 'Delete Selected')}</span>
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Problems table */}
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-secondary)]">
                <th className="w-10 p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === problems.length && problems.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded accent-[var(--color-primary)]"
                  />
                </th>
                <th className="w-12 p-3 text-left text-sm font-medium text-[var(--color-muted)]">#</th>
                <th className="w-24 p-3 text-left text-sm font-medium text-[var(--color-muted)]">
                  {t('problem.type.label', 'Type')}
                </th>
                <th className="w-24 p-3 text-left text-sm font-medium text-[var(--color-muted)]">
                  {t('problem.difficulty.label', 'Difficulty')}
                </th>
                <th className="min-w-[200px] p-3 text-left text-sm font-medium text-[var(--color-muted)]">
                  {t('problem.content', 'Content')}
                </th>
                <th className="w-24 p-3 text-left text-sm font-medium text-[var(--color-muted)]">
                  {t('problem.answer', 'Answer')}
                </th>
                <th className="w-24 p-3 text-center text-sm font-medium text-[var(--color-muted)]">
                  {t('common.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem, index) => (
                <tr
                  key={problem.id}
                  className={`border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-secondary)] ${
                    selectedRows.has(problem.id) ? 'bg-[var(--color-primary-bg)]' : ''
                  }`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(problem.id)}
                      onChange={() => handleSelectRow(problem.id)}
                      className="h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                  </td>
                  <td className="p-3 text-sm font-medium">{index + 1}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getTypeBadgeClass(problem.type)}`}>
                      {problem.type === 'choice'
                        ? t('problem.type.choice', 'Choice')
                        : t('problem.type.fillBlank', 'Fill Blank')}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getDifficultyBadgeClass(problem.difficulty)}`}>
                      {t(`problem.difficulty.${problem.difficulty}`, problem.difficulty)}
                    </span>
                  </td>
                  <td className="max-w-[300px] p-3">
                    <div className="line-clamp-2 text-sm">
                      {problem.content ? (
                        <LaTeXRenderer content={problem.content} className="text-sm" />
                      ) : (
                        <span className="italic text-[var(--color-muted)]">
                          {t('problem.noContent', 'No content')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-sm">{getAnswerDisplay(problem)}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditProblem(index)}
                        className="h-8 w-8 p-0"
                        title={t('common.edit', 'Edit')}
                      >
                        {Icons.edit}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProblem(index)}
                        className="h-8 w-8 p-0 text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
                        title={t('common.delete', 'Delete')}
                      >
                        {Icons.delete}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {problems.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--color-muted)]">
                    {t('problem.noProblems', 'No problems yet. Click "Add Problem" to start.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add problem row */}
        <div className="border-t border-[var(--color-border)] p-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleAddProblem}
            className="w-full justify-center gap-2"
          >
            {Icons.add}
            {t('problem.addProblem', 'Add Problem')}
          </Button>
        </div>
      </GlassCard>

      {/* Submit bar */}
      <div className="flex items-center justify-between rounded-xl bg-[var(--color-secondary)] p-4">
        <div className="text-sm text-[var(--color-muted)]">
          {t('problem.totalProblems', { count: problems.length })}
        </div>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className="gap-2"
        >
          {Icons.save}
          {isSubmitting
            ? t('common.saving', 'Saving...')
            : t('problem.saveAllProblems', 'Save All Problems')}
        </Button>
      </div>
    </div>
  );
}
