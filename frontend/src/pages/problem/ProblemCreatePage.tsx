import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { LaTeXEditor } from '@/components/ui/latex-editor';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { TableOfContents } from '@/components/ui/table-of-contents';
import { problemApi } from '@/services/problem.api';
import { useProblemStore } from '@/store/problemStore';
import { parseLatexToNumber, formatNumericResult } from '@/utils/latex-math-parser';
import {
  parseProblemText,
  parseMultipleProblems,
  hasMultipleProblems,
  getExampleText,
  getFillBlankExampleText,
  getMultipleProblemExampleText,
} from '@/utils/problem-text-parser';
import {
  BatchProblemEditor,
  ProblemEditModal,
  JsonImporter,
} from '@/components/problem';
import type { BatchProblem } from '@/components/problem';

// Input modes
type InputMode = 'form' | 'text' | 'batch' | 'json';

// 选择题（单选/多选由正确答案数量决定）和填空题
type ProblemType = 'choice' | 'fill-blank';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Option {
  id: string;
  label: string;
  content: string;
}

// Mode Icons - SVG
const ModeIcons = {
  form: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  text: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  batch: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  json: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

// Section icons
const Icons = {
  info: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  content: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  options: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  answer: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  explanation: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  additional: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
};

export function ProblemCreatePage() {
  const { t } = useTranslation();
  const { id: bankId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addProblem } = useProblemStore();

  // Input mode
  const [inputMode, setInputMode] = useState<InputMode>('form');

  // Single form state
  const [type, setType] = useState<ProblemType>('choice');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState<Option[]>([
    { id: 'A', label: 'A', content: '' },
    { id: 'B', label: 'B', content: '' },
    { id: 'C', label: 'C', content: '' },
    { id: 'D', label: 'D', content: '' },
  ]);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [fillBlankAnswer, setFillBlankAnswer] = useState('');
  const [answerExplanation, setAnswerExplanation] = useState('');
  const [source, setSource] = useState('');
  const [points, setPoints] = useState(10);
  const [estimatedTime, setEstimatedTime] = useState(60);

  // Text mode state
  const [pasteText, setPasteText] = useState('');
  const [parseSuccess, setParseSuccess] = useState(false);

  // Batch mode state
  const [batchProblems, setBatchProblems] = useState<BatchProblem[]>([]);
  const [editingProblemIndex, setEditingProblemIndex] = useState<number | null>(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Get current language for example text
  const currentLang = (typeof window !== 'undefined' && window.localStorage.getItem('i18nextLng')?.startsWith('zh')) ? 'zh' : 'en';

  // Handle parsing pasted text
  const handleParseText = () => {
    if (!pasteText.trim()) return;

    // Check if multiple problems
    if (hasMultipleProblems(pasteText)) {
      const parsedProblems = parseMultipleProblems(pasteText);
      const batchItems: BatchProblem[] = parsedProblems.map(p => ({
        id: Math.random().toString(36).substring(2, 9),
        type: p.type,
        difficulty: p.difficulty || 'medium',
        content: p.content,
        options: p.options.length > 0 ? p.options : [
          { id: 'A', label: 'A', content: '' },
          { id: 'B', label: 'B', content: '' },
          { id: 'C', label: 'C', content: '' },
          { id: 'D', label: 'D', content: '' },
        ],
        correctAnswer: p.type === 'choice'
          ? (p.correctAnswers.length === 1 ? p.correctAnswers[0] : p.correctAnswers)
          : p.fillBlankAnswer,
        answerExplanation: p.explanation,
        source: p.source,
        points: 10,
        estimatedTime: 60,
      }));

      setBatchProblems(batchItems);
      setParseSuccess(true);
      setTimeout(() => {
        setInputMode('batch');
        setParseSuccess(false);
      }, 1000);
    } else {
      // Single problem - use original logic
      const parsed = parseProblemText(pasteText);

      if (parsed.difficulty) {
        setDifficulty(parsed.difficulty);
      }
      setType(parsed.type);
      setContent(parsed.content);

      if (parsed.type === 'choice') {
        const newOptions = parsed.options.length > 0 ? parsed.options : [
          { id: 'A', label: 'A', content: '' },
          { id: 'B', label: 'B', content: '' },
          { id: 'C', label: 'C', content: '' },
          { id: 'D', label: 'D', content: '' },
        ];
        while (newOptions.length < 4) {
          const label = 'ABCDEFGH'[newOptions.length];
          newOptions.push({ id: label, label, content: '' });
        }
        setOptions(newOptions);
        setCorrectAnswers(parsed.correctAnswers);
        setFillBlankAnswer('');
      } else {
        setFillBlankAnswer(parsed.fillBlankAnswer);
        setCorrectAnswers([]);
      }

      setAnswerExplanation(parsed.explanation);
      if (parsed.source) {
        setSource(parsed.source);
      }

      setParseSuccess(true);
      setTimeout(() => {
        setInputMode('form');
        setParseSuccess(false);
      }, 1500);
    }
  };

  // 计算是单选还是多选
  const isMultipleChoice = correctAnswers.length > 1;

  // 解析 LaTeX 填空答案为数值
  const parsedFillBlankAnswer = useMemo(() => {
    if (!fillBlankAnswer.trim()) return null;
    return parseLatexToNumber(fillBlankAnswer);
  }, [fillBlankAnswer]);

  // Table of contents items
  const tocItems = useMemo(() => {
    const items = [
      { id: 'section-basic', title: t('problem.basicInfo', 'Basic Information') },
      { id: 'section-content', title: t('problem.content', 'Problem Content') },
    ];

    if (type === 'choice') {
      items.push({ id: 'section-options', title: t('problem.options', 'Options') });
    } else {
      items.push({ id: 'section-answer', title: t('problem.correctAnswer', 'Correct Answer') });
    }

    items.push(
      { id: 'section-explanation', title: t('problem.explanation', 'Answer Explanation') },
      { id: 'section-additional', title: t('problem.additionalInfo', 'Additional Info') }
    );

    return items;
  }, [type, t]);

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

  // Submit single problem
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError(t('problem.contentRequired', 'Problem content is required'));
      return;
    }

    if (type === 'choice' && correctAnswers.length === 0) {
      setError(t('problem.correctAnswerRequired', 'Please select at least one correct answer'));
      return;
    }

    if (type === 'fill-blank' && !fillBlankAnswer.trim()) {
      setError(t('problem.correctAnswerRequired', 'Please enter the correct answer'));
      return;
    }

    if (!bankId) return;

    setIsSubmitting(true);
    try {
      // Use underscore format for backend compatibility
      const actualType = type === 'choice'
        ? (correctAnswers.length > 1 ? 'multiple_choice' : 'single_choice')
        : 'fill_blank';

      let finalAnswer: string | string[];
      let displayAnswerValue: string | undefined;
      if (type === 'choice') {
        finalAnswer = correctAnswers.length === 1 ? correctAnswers[0] : correctAnswers;
      } else {
        if (parsedFillBlankAnswer?.success && parsedFillBlankAnswer.value !== undefined) {
          // Store numeric value for grading, but keep original LaTeX for display
          finalAnswer = parsedFillBlankAnswer.value.toString();
          displayAnswerValue = fillBlankAnswer.trim(); // Preserve original LaTeX
        } else {
          finalAnswer = fillBlankAnswer.trim();
        }
      }

      // Filter out empty options
      const validOptions = type === 'choice'
        ? options.filter(opt => opt.content.trim())
        : undefined;

      const problemData = {
        bankId,
        type: actualType,
        difficulty,
        content: content.trim(),
        options: validOptions,
        correctAnswer: finalAnswer,
        displayAnswer: displayAnswerValue, // Symbolic LaTeX answer for display
        answerExplanation: answerExplanation.trim() || undefined,
        source: source.trim() || undefined,
        points,
        estimatedTime,
      };

      const newProblem = await problemApi.problems.create(problemData);
      addProblem(newProblem);
      navigate(`/problems/${bankId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.createFailed', 'Failed to create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit batch problems
  const handleBatchSubmit = async () => {
    if (!bankId || batchProblems.length === 0) return;

    setIsSubmitting(true);
    setError('');

    try {
      const problemsData = batchProblems.map(p => {
        // Use underscore format for backend compatibility
        const problemType = p.type === 'choice'
          ? (Array.isArray(p.correctAnswer) && p.correctAnswer.length > 1 ? 'multiple_choice' : 'single_choice')
          : 'fill_blank';

        // Filter out empty options
        const validOptions = p.type === 'choice'
          ? p.options.filter(opt => opt.content.trim())
          : undefined;

        return {
          bankId,
          type: problemType,
          difficulty: p.difficulty,
          content: p.content,
          options: validOptions,
          correctAnswer: p.correctAnswer,
          answerExplanation: p.answerExplanation || undefined,
          source: p.source || undefined,
          points: p.points,
          estimatedTime: p.estimatedTime,
        };
      });

      await problemApi.problems.batchCreate(problemsData);
      navigate(`/problems/${bankId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.createFailed', 'Failed to create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle JSON import
  const handleJsonImport = (problems: BatchProblem[]) => {
    setBatchProblems(prev => [...prev, ...problems]);
    setInputMode('batch');
  };

  // Handle edit problem in batch
  const handleEditProblem = (index: number) => {
    setEditingProblemIndex(index);
  };

  const handleSaveProblem = (problem: BatchProblem) => {
    if (editingProblemIndex !== null) {
      const newProblems = [...batchProblems];
      newProblems[editingProblemIndex] = problem;
      setBatchProblems(newProblems);
      setEditingProblemIndex(null);
    }
  };

  // Mode buttons
  const modes: { id: InputMode; label: string; icon: React.ReactNode }[] = [
    { id: 'form', label: t('problem.formMode', 'Single'), icon: ModeIcons.form },
    { id: 'text', label: t('problem.textMode', 'Text'), icon: ModeIcons.text },
    { id: 'batch', label: t('problem.batchMode', 'Batch'), icon: ModeIcons.batch },
    { id: 'json', label: t('problem.jsonImport', 'JSON'), icon: ModeIcons.json },
  ];

  return (
    <div className="flex gap-8">
      {/* Sidebar with Table of Contents - only for form mode */}
      {inputMode === 'form' && (
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            <GlassCard className="p-4">
              <TableOfContents items={tocItems} />
            </GlassCard>

            <div className="mt-4 space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/problems/${bankId}`)}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('common.back', 'Back')}
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className="min-w-0 flex-1">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            {inputMode !== 'form' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/problems/${bankId}`)}
                className="h-8 w-8 p-0"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold">{t('problem.addProblem', 'Add Problem')}</h1>
              <p className="mt-1 text-[var(--color-muted)]">
                {t('problem.addProblemDesc', 'Create new problems for your problem bank.')}
              </p>
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[var(--color-secondary)] p-1">
            {modes.map(mode => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setInputMode(mode.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  inputMode === mode.id
                    ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                }`}
              >
                {mode.icon}
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-xl bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">
            {error}
          </div>
        )}

        {/* Text Mode */}
        {inputMode === 'text' && (
          <GlassCard className="mb-6 p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('problem.pasteText', 'Paste Problem Text')}</h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">
              {t('problem.pasteTextDescMultiple', 'Paste formatted text. Supports multiple problems separated by --- or numbered lists.')}
            </p>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-muted)]">
                  {t('problem.inputText', 'Input Text')}
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={t('problem.pasteTextPlaceholder', 'Paste your problem text here...')}
                  rows={16}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 font-mono text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleParseText}
                    disabled={!pasteText.trim() || parseSuccess}
                    className={parseSuccess ? 'bg-[var(--color-success)] hover:bg-[var(--color-success)]' : ''}
                  >
                    {parseSuccess ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('problem.parseSuccess', 'Parsed!')}
                      </span>
                    ) : (
                      t('problem.parse', 'Parse')
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPasteText(getExampleText(currentLang))}>
                    {t('problem.loadChoiceExample', 'Choice')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPasteText(getFillBlankExampleText(currentLang))}>
                    {t('problem.loadFillBlankExample', 'Fill-blank')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPasteText(getMultipleProblemExampleText(currentLang))}>
                    {t('problem.loadMultipleExample', 'Multiple')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPasteText('')} disabled={!pasteText}>
                    {t('common.clear', 'Clear')}
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-muted)]">
                  {t('problem.formatGuide', 'Format Guide')}
                </label>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-medium">{t('problem.multipleProblemSeparator', 'Multiple Problems')}</h4>
                      <p className="mt-1 text-[var(--color-muted)]">
                        {t('problem.multipleProblemSeparatorDesc', 'Use --- or === to separate problems, or number them 1. 2. 3.')}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium">{t('problem.difficultyKeywords', 'Difficulty Keywords')}</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-xs text-[var(--color-success)]">
                          简单 / Easy
                        </span>
                        <span className="rounded-full bg-[var(--color-warning-bg)] px-2 py-0.5 text-xs text-[var(--color-warning)]">
                          中等 / Medium
                        </span>
                        <span className="rounded-full bg-[var(--color-error-bg)] px-2 py-0.5 text-xs text-[var(--color-error)]">
                          困难 / Hard
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium">{t('problem.optionsFormat', 'Options Format')}</h4>
                      <p className="mt-1 text-[var(--color-muted)]">A. / A、/ A) / A:</p>
                    </div>
                    <div>
                      <h4 className="font-medium">{t('problem.answerFormat', 'Answer Format')}</h4>
                      <p className="mt-1 text-[var(--color-muted)]">答案：A / Answer: AB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Batch Mode */}
        {inputMode === 'batch' && (
          <BatchProblemEditor
            problems={batchProblems}
            onProblemsChange={setBatchProblems}
            onEditProblem={handleEditProblem}
            onSubmit={handleBatchSubmit}
            isSubmitting={isSubmitting}
          />
        )}

        {/* JSON Mode */}
        {inputMode === 'json' && (
          <JsonImporter onImport={handleJsonImport} />
        )}

        {/* Form Mode - Original form */}
        {inputMode === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Basic Information */}
            <CollapsibleSection
              id="section-basic"
              title={t('problem.basicInfo', 'Basic Information')}
              icon={Icons.info}
              defaultOpen={true}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">{t('problem.type.label', 'Type')}</label>
                  <select
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value as ProblemType);
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
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    <option value="easy">{t('problem.difficulty.easy', 'Easy')}</option>
                    <option value="medium">{t('problem.difficulty.medium', 'Medium')}</option>
                    <option value="hard">{t('problem.difficulty.hard', 'Hard')}</option>
                  </select>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 2: Problem Content */}
            <CollapsibleSection
              id="section-content"
              title={t('problem.content', 'Problem Content')}
              icon={Icons.content}
              defaultOpen={true}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-muted)]">
                    {t('problem.edit', 'Edit')}
                  </label>
                  <LaTeXEditor
                    value={content}
                    onChange={setContent}
                    placeholder={t('problem.contentPlaceholder', 'Enter problem content. Type \\ for LaTeX commands.')}
                    rows={8}
                  />
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {t('problem.latexHint', 'Tip: Type \\ to see LaTeX commands. Use $...$ for inline math and $$...$$ for display math')}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-muted)]">
                    {t('problem.preview', 'Preview')}
                  </label>
                  <div className="min-h-[200px] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                    {content ? (
                      <LaTeXRenderer content={content} className="leading-relaxed" />
                    ) : (
                      <p className="text-[var(--color-muted)] italic">
                        {t('problem.previewPlaceholder', 'Preview will appear here...')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 3: Options (for choice questions) */}
            {type === 'choice' && (
              <CollapsibleSection
                id="section-options"
                title={t('problem.options', 'Options')}
                icon={Icons.options}
                defaultOpen={true}
              >
                <div className="mb-4 flex items-center justify-end">
                  <div className={`rounded-full px-3 py-1 text-sm font-medium ${
                    isMultipleChoice
                      ? 'bg-[var(--color-info-bg)] text-[var(--color-info)]'
                      : 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                  }`}>
                    {isMultipleChoice
                      ? t('problem.type.multipleChoice', 'Multiple Choice')
                      : correctAnswers.length === 1
                        ? t('problem.type.singleChoice', 'Single Choice')
                        : t('problem.selectAnswer', 'Select Answer(s)')}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-[var(--color-muted)]">
                      {t('problem.edit', 'Edit')}
                    </label>
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
                          placeholder={t('problem.optionPlaceholder', 'Enter option content (supports LaTeX)')}
                          className="flex-1"
                        />
                        {options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(index)}
                            className="text-[var(--color-error)] hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error)]"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    {options.length < 8 && (
                      <Button type="button" variant="outline" onClick={addOption} className="mt-3">
                        + {t('problem.addOption', 'Add Option')}
                      </Button>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-muted)]">
                      {t('problem.preview', 'Preview')}
                    </label>
                    <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                      {options.map((option) => {
                        const isCorrect = correctAnswers.includes(option.id);
                        return (
                          <div
                            key={option.id}
                            className={`flex items-start gap-2 rounded-lg p-2 transition-colors ${
                              isCorrect
                                ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                                : ''
                            }`}
                          >
                            <span className="font-bold">{option.label}.</span>
                            {option.content ? (
                              <LaTeXRenderer content={option.content} />
                            ) : (
                              <span className="text-[var(--color-muted)] italic">...</span>
                            )}
                            {isCorrect && (
                              <span className="ml-auto text-[var(--color-success)]">✓</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  {t('problem.choiceHint', 'Check one option for single choice, or multiple options for multiple choice.')}
                </p>
              </CollapsibleSection>
            )}

            {/* Section 3: Answer for fill-blank */}
            {type === 'fill-blank' && (
              <CollapsibleSection
                id="section-answer"
                title={t('problem.correctAnswer', 'Correct Answer')}
                icon={Icons.answer}
                defaultOpen={true}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-muted)]">
                      {t('problem.edit', 'Edit')}
                    </label>
                    <Input
                      type="text"
                      value={fillBlankAnswer}
                      onChange={(e) => setFillBlankAnswer(e.target.value)}
                      placeholder={t('problem.answerPlaceholder', 'Enter the correct answer (supports LaTeX)')}
                    />

                    {fillBlankAnswer.trim() && parsedFillBlankAnswer && (
                      <div className="mt-3">
                        {parsedFillBlankAnswer.success ? (
                          <div className="flex items-center gap-2 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>
                              {t('problem.numericAnswer', 'Numeric answer detected')}:
                              <strong className="ml-1 font-mono">
                                {formatNumericResult(parsedFillBlankAnswer.value!)}
                              </strong>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning)]">
                            <span>{t('problem.textAnswer', 'Text answer (exact match required)')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-muted)]">
                      {t('problem.preview', 'Preview')}
                    </label>
                    <div className="min-h-[42px] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                      {fillBlankAnswer ? (
                        <LaTeXRenderer content={fillBlankAnswer} />
                      ) : (
                        <span className="text-[var(--color-muted)] italic">...</span>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Section 4: Explanation */}
            <CollapsibleSection
              id="section-explanation"
              title={t('problem.explanation', 'Answer Explanation')}
              icon={Icons.explanation}
              defaultOpen={false}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-muted)]">
                    {t('problem.edit', 'Edit')}
                  </label>
                  <LaTeXEditor
                    value={answerExplanation}
                    onChange={setAnswerExplanation}
                    placeholder={t('problem.explanationPlaceholder', 'Enter explanation (optional)')}
                    rows={4}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-muted)]">
                    {t('problem.preview', 'Preview')}
                  </label>
                  <div className="min-h-[100px] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                    {answerExplanation ? (
                      <LaTeXRenderer content={answerExplanation} className="leading-relaxed" />
                    ) : (
                      <p className="text-[var(--color-muted)] italic">
                        {t('problem.previewPlaceholder', 'Preview will appear here...')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 5: Additional Info */}
            <CollapsibleSection
              id="section-additional"
              title={t('problem.additionalInfo', 'Additional Information')}
              icon={Icons.additional}
              defaultOpen={false}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">{t('problem.points', 'Points')}</label>
                  <Input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                    min={1}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">{t('problem.estimatedTime', 'Time (seconds)')}</label>
                  <Input
                    type="number"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 0)}
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
                    placeholder={t('problem.sourcePlaceholder', 'e.g., AMC 2024')}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/problems/${bankId}`)}
                disabled={isSubmitting}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
              </Button>
            </div>
          </form>
        )}

        {/* Edit Modal */}
        {editingProblemIndex !== null && batchProblems[editingProblemIndex] && (
          <ProblemEditModal
            problem={batchProblems[editingProblemIndex]}
            onSave={handleSaveProblem}
            onClose={() => setEditingProblemIndex(null)}
          />
        )}
      </main>
    </div>
  );
}
