import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { LaTeXEditor } from '@/components/ui/latex-editor';
import { parseLatexToNumber, formatNumericResult } from '@/utils/latex-math-parser';
import type { BatchProblem } from './BatchProblemEditor';

interface ProblemEditModalProps {
  problem: BatchProblem;
  onSave: (problem: BatchProblem) => void;
  onClose: () => void;
}

// SVG Icons
const Icons = {
  close: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  save: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  add: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
};

export function ProblemEditModal({ problem, onSave, onClose }: ProblemEditModalProps) {
  const { t } = useTranslation();

  const [type, setType] = useState(problem.type);
  const [difficulty, setDifficulty] = useState(problem.difficulty);
  const [content, setContent] = useState(problem.content);
  const [options, setOptions] = useState(problem.options);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(
    Array.isArray(problem.correctAnswer)
      ? problem.correctAnswer
      : problem.correctAnswer ? [problem.correctAnswer] : []
  );
  const [fillBlankAnswer, setFillBlankAnswer] = useState(
    problem.type === 'fill-blank' ? (problem.correctAnswer as string) : ''
  );
  const [answerExplanation, setAnswerExplanation] = useState(problem.answerExplanation);
  const [source, setSource] = useState(problem.source);
  const [points, setPoints] = useState(problem.points);
  const [estimatedTime, setEstimatedTime] = useState(problem.estimatedTime);

  // Reset state when problem changes
  useEffect(() => {
    setType(problem.type);
    setDifficulty(problem.difficulty);
    setContent(problem.content);
    setOptions(problem.options);
    setCorrectAnswers(
      Array.isArray(problem.correctAnswer)
        ? problem.correctAnswer
        : problem.correctAnswer ? [problem.correctAnswer] : []
    );
    setFillBlankAnswer(problem.type === 'fill-blank' ? (problem.correctAnswer as string) : '');
    setAnswerExplanation(problem.answerExplanation);
    setSource(problem.source);
    setPoints(problem.points);
    setEstimatedTime(problem.estimatedTime);
  }, [problem]);

  // Parse fill-blank answer
  const parsedFillBlankAnswer = useMemo(() => {
    if (!fillBlankAnswer.trim()) return null;
    return parseLatexToNumber(fillBlankAnswer);
  }, [fillBlankAnswer]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index].content = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    const labels = 'ABCDEFGH';
    if (options.length < 8) {
      setOptions([...options, { id: labels[options.length], label: labels[options.length], content: '' }]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const removedId = options[index].id;
      const newOptions = options.filter((_, i) => i !== index).map((opt, i) => ({
        ...opt,
        id: 'ABCDEFGH'[i],
        label: 'ABCDEFGH'[i],
      }));
      setOptions(newOptions);
      setCorrectAnswers(prev => prev.filter(a => a !== removedId));
    }
  };

  const handleCorrectAnswerToggle = (optionId: string) => {
    setCorrectAnswers(prev => {
      if (prev.includes(optionId)) {
        return prev.filter(a => a !== optionId);
      } else {
        return [...prev, optionId].sort();
      }
    });
  };

  const handleSave = () => {
    let finalAnswer: string | string[];
    if (type === 'choice') {
      finalAnswer = correctAnswers.length === 1 ? correctAnswers[0] : correctAnswers;
    } else {
      if (parsedFillBlankAnswer?.success && parsedFillBlankAnswer.value !== undefined) {
        finalAnswer = parsedFillBlankAnswer.value.toString();
      } else {
        finalAnswer = fillBlankAnswer.trim();
      }
    }

    onSave({
      ...problem,
      type,
      difficulty,
      content,
      options: type === 'choice' ? options : problem.options,
      correctAnswer: finalAnswer,
      answerExplanation,
      source,
      points,
      estimatedTime,
    });
  };

  const isValid = content.trim() && (
    type === 'fill-blank' ? fillBlankAnswer.trim() : correctAnswers.length > 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <GlassCard className="max-h-[90vh] w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <h2 className="text-lg font-semibold">{t('problem.editProblem', 'Edit Problem')}</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            {Icons.close}
          </Button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-4">
          <div className="space-y-6">
            {/* Basic info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t('problem.type.label', 'Type')}</label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as 'choice' | 'fill-blank');
                    setCorrectAnswers([]);
                    setFillBlankAnswer('');
                  }}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="choice">{t('problem.type.choice', 'Choice (Single/Multiple)')}</option>
                  <option value="fill-blank">{t('problem.type.fillBlank', 'Fill in the Blank')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t('problem.difficulty.label', 'Difficulty')}</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="easy">{t('problem.difficulty.easy', 'Easy')}</option>
                  <option value="medium">{t('problem.difficulty.medium', 'Medium')}</option>
                  <option value="hard">{t('problem.difficulty.hard', 'Hard')}</option>
                </select>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">{t('problem.content', 'Problem Content')}</label>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <LaTeXEditor
                    value={content}
                    onChange={setContent}
                    placeholder={t('problem.contentPlaceholder', 'Enter problem content...')}
                    rows={6}
                  />
                </div>
                <div className="min-h-[150px] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                  {content ? (
                    <LaTeXRenderer content={content} />
                  ) : (
                    <span className="italic text-[var(--color-muted)]">
                      {t('problem.previewPlaceholder', 'Preview...')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Options (for choice) */}
            {type === 'choice' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">{t('problem.options', 'Options')}</label>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    correctAnswers.length > 1
                      ? 'bg-[var(--color-info-bg)] text-[var(--color-info)]'
                      : 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                  }`}>
                    {correctAnswers.length > 1
                      ? t('problem.type.multipleChoice', 'Multiple Choice')
                      : correctAnswers.length === 1
                        ? t('problem.type.singleChoice', 'Single Choice')
                        : t('problem.selectAnswer', 'Select Answer(s)')}
                  </span>
                </div>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={correctAnswers.includes(option.id)}
                          onChange={() => handleCorrectAnswerToggle(option.id)}
                          className="h-4 w-4 rounded accent-green-500"
                        />
                        <span className="w-6 font-bold">{option.label}.</span>
                      </label>
                      <Input
                        type="text"
                        value={option.content}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={t('problem.optionPlaceholder', 'Option content...')}
                        className="flex-1"
                      />
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                          className="text-[var(--color-error)]"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  {options.length < 8 && (
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                      {Icons.add}
                      <span className="ml-1">{t('problem.addOption', 'Add Option')}</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Answer (for fill-blank) */}
            {type === 'fill-blank' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t('problem.correctAnswer', 'Correct Answer')}</label>
                <Input
                  type="text"
                  value={fillBlankAnswer}
                  onChange={(e) => setFillBlankAnswer(e.target.value)}
                  placeholder={t('problem.answerPlaceholder', 'Enter the correct answer...')}
                />
                {fillBlankAnswer.trim() && parsedFillBlankAnswer && (
                  <div className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    parsedFillBlankAnswer.success
                      ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                      : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
                  }`}>
                    {parsedFillBlankAnswer.success ? (
                      <span>
                        {t('problem.numericAnswer', 'Numeric answer')}:
                        <strong className="ml-1 font-mono">
                          {formatNumericResult(parsedFillBlankAnswer.value!)}
                        </strong>
                      </span>
                    ) : (
                      <span>{t('problem.textAnswer', 'Text answer (exact match)')}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">{t('problem.explanation', 'Answer Explanation')}</label>
              <LaTeXEditor
                value={answerExplanation}
                onChange={setAnswerExplanation}
                placeholder={t('problem.explanationPlaceholder', 'Enter explanation (optional)...')}
                rows={3}
              />
            </div>

            {/* Additional info */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t('problem.points', 'Points')}</label>
                <Input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value) || 10)}
                  min={1}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t('problem.estimatedTime', 'Time (sec)')}</label>
                <Input
                  type="number"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 60)}
                  min={10}
                  max={600}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t('problem.source', 'Source')}</label>
                <Input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., AMC 2024"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[var(--color-border)] p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={!isValid}>
            {Icons.save}
            <span className="ml-1">{t('common.save', 'Save')}</span>
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
