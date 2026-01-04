import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import type { BatchProblem } from './BatchProblemEditor';
import { addDisplayStyleToIntegrals } from '@/utils/problem-text-parser';

interface JsonImporterProps {
  onImport: (problems: BatchProblem[]) => void;
}

// SVG Icons
const Icons = {
  upload: (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
  file: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  check: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  download: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const EXAMPLE_JSON = {
  problems: [
    {
      type: 'single-choice',
      difficulty: 'medium',
      content: '已知函数 $f(x) = x^2 + 2x + 1$，求 $f(2)$ 的值。',
      options: [
        { id: 'A', label: 'A', content: '5' },
        { id: 'B', label: 'B', content: '7' },
        { id: 'C', label: 'C', content: '9' },
        { id: 'D', label: 'D', content: '11' },
      ],
      correctAnswer: 'C',
      answerExplanation: '$f(2) = 2^2 + 2 \\times 2 + 1 = 4 + 4 + 1 = 9$',
      points: 10,
      estimatedTime: 60,
    },
    {
      type: 'fill-blank',
      difficulty: 'hard',
      content: '计算积分 $\\int_0^1 x^2 dx$ 的值。',
      correctAnswer: '1/3',
      answerExplanation: '$\\int_0^1 x^2 dx = \\frac{x^3}{3} \\Big|_0^1 = \\frac{1}{3}$',
      points: 15,
      estimatedTime: 120,
    },
  ],
};

export function JsonImporter({ onImport }: JsonImporterProps) {
  const { t } = useTranslation();
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [validProblems, setValidProblems] = useState<BatchProblem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const parseAndValidate = useCallback((text: string) => {
    setError('');
    setValidProblems([]);

    if (!text.trim()) {
      return;
    }

    try {
      const data = JSON.parse(text);

      // Support both { problems: [...] } and [...] formats
      const problemsArray = Array.isArray(data) ? data : data.problems;

      if (!Array.isArray(problemsArray)) {
        setError(t('problem.jsonInvalidFormat', 'Invalid format: expected an array of problems or { problems: [...] }'));
        return;
      }

      const parsed: BatchProblem[] = [];
      const errors: string[] = [];

      problemsArray.forEach((item, index) => {
        try {
          // Validate required fields
          if (!item.content) {
            errors.push(`#${index + 1}: ${t('problem.missingContent', 'Missing content')}`);
            return;
          }

          // Normalize type
          let type: 'choice' | 'fill-blank' = 'choice';
          if (item.type === 'fill-blank' || item.type === 'fill_blank') {
            type = 'fill-blank';
          } else if (item.type === 'single-choice' || item.type === 'single_choice' ||
                     item.type === 'multiple-choice' || item.type === 'multiple_choice' ||
                     item.type === 'choice') {
            type = 'choice';
          }

          // Normalize difficulty
          let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
          if (['easy', 'simple', 'basic'].includes(item.difficulty?.toLowerCase())) {
            difficulty = 'easy';
          } else if (['hard', 'difficult', 'challenging'].includes(item.difficulty?.toLowerCase())) {
            difficulty = 'hard';
          }

          // Normalize options
          let options = [
            { id: 'A', label: 'A', content: '' },
            { id: 'B', label: 'B', content: '' },
            { id: 'C', label: 'C', content: '' },
            { id: 'D', label: 'D', content: '' },
          ];
          if (type === 'choice' && Array.isArray(item.options)) {
            options = item.options.map((opt: { id?: string; label?: string; content?: string }, i: number) => ({
              id: opt.id || 'ABCDEFGH'[i],
              label: opt.label || 'ABCDEFGH'[i],
              content: opt.content || '',
            }));
          }

          // Normalize answer
          let correctAnswer: string | string[] = '';
          if (item.correctAnswer !== undefined) {
            correctAnswer = item.correctAnswer;
          } else if (item.answer !== undefined) {
            correctAnswer = item.answer;
          }

          // Apply displaystyle to integrals in content, options, and explanation
          const processedContent = addDisplayStyleToIntegrals(item.content);
          const processedOptions = options.map(opt => ({
            ...opt,
            content: addDisplayStyleToIntegrals(opt.content),
          }));
          const processedExplanation = addDisplayStyleToIntegrals(
            item.answerExplanation || item.explanation || ''
          );

          parsed.push({
            id: generateId(),
            type,
            difficulty,
            content: processedContent,
            options: processedOptions,
            correctAnswer,
            answerExplanation: processedExplanation,
            source: item.source || '',
            points: item.points || 10,
            estimatedTime: item.estimatedTime || 60,
          });
        } catch {
          errors.push(`#${index + 1}: ${t('problem.parseError', 'Parse error')}`);
        }
      });

      if (errors.length > 0 && parsed.length === 0) {
        setError(errors.join('\n'));
        return;
      }

      setValidProblems(parsed);
      if (errors.length > 0) {
        setError(t('problem.partialImport', { count: errors.length }) + '\n' + errors.slice(0, 3).join('\n'));
      }
    } catch {
      setError(t('problem.jsonParseError', 'Invalid JSON format. Please check your input.'));
    }
  }, [t]);

  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      setError(t('problem.jsonFileRequired', 'Please upload a .json file'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setJsonText(text);
      parseAndValidate(text);
    };
    reader.onerror = () => {
      setError(t('problem.fileReadError', 'Failed to read file'));
    };
    reader.readAsText(file);
  }, [parseAndValidate, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleImport = () => {
    if (validProblems.length > 0) {
      onImport(validProblems);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([JSON.stringify(EXAMPLE_JSON, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'problems-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadExample = () => {
    const text = JSON.stringify(EXAMPLE_JSON, null, 2);
    setJsonText(text);
    parseAndValidate(text);
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="text-[var(--color-muted)]">{Icons.upload}</div>
          <div>
            <p className="font-medium">{t('problem.dropJsonFile', 'Drop JSON file here')}</p>
            <p className="text-sm text-[var(--color-muted)]">
              {t('problem.orClickToUpload', 'or click to upload')}
            </p>
          </div>
          <input
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
            id="json-file-input"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('json-file-input')?.click()}
          >
            {Icons.file}
            <span className="ml-2">{t('problem.selectFile', 'Select File')}</span>
          </Button>
        </div>
      </div>

      {/* Manual input */}
      <GlassCard className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium">{t('problem.pasteJson', 'Or paste JSON directly')}</label>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleLoadExample}>
              {t('problem.loadExample', 'Load Example')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleDownloadTemplate}>
              {Icons.download}
              <span className="ml-1">{t('problem.downloadTemplate', 'Template')}</span>
            </Button>
          </div>
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            parseAndValidate(e.target.value);
          }}
          placeholder={t('problem.jsonPlaceholder', 'Paste your JSON here...')}
          rows={12}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 font-mono text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
        />
      </GlassCard>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">
          {Icons.error}
          <pre className="flex-1 whitespace-pre-wrap text-sm">{error}</pre>
        </div>
      )}

      {/* Success preview */}
      {validProblems.length > 0 && (
        <div className="rounded-xl bg-[var(--color-success-bg)] p-4">
          <div className="flex items-center gap-2 text-[var(--color-success)]">
            {Icons.check}
            <span className="font-medium">
              {t('problem.validProblemsFound', { count: validProblems.length })}
            </span>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            {validProblems.slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 text-[var(--color-success)]">
                <span className="font-mono">#{i + 1}</span>
                <span className="truncate">{p.content.substring(0, 50)}...</span>
              </div>
            ))}
            {validProblems.length > 5 && (
              <div className="text-[var(--color-success)] opacity-70">
                {t('problem.andMore', { count: validProblems.length - 5 })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import button */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleImport}
          disabled={validProblems.length === 0}
          className="gap-2"
        >
          {Icons.check}
          {t('problem.importProblems', { count: validProblems.length })}
        </Button>
      </div>

      {/* Format guide */}
      <GlassCard className="p-4">
        <h3 className="mb-3 text-sm font-medium">{t('problem.jsonFormat', 'JSON Format')}</h3>
        <pre className="overflow-x-auto rounded-lg bg-[var(--color-background)] p-3 text-xs">
{`{
  "problems": [
    {
      "type": "single-choice",
      "difficulty": "medium",
      "content": "题目内容（支持LaTeX）",
      "options": [
        {"id": "A", "label": "A", "content": "选项A"},
        {"id": "B", "label": "B", "content": "选项B"}
      ],
      "correctAnswer": "A",
      "answerExplanation": "解析",
      "points": 10,
      "estimatedTime": 60
    }
  ]
}`}
        </pre>
      </GlassCard>
    </div>
  );
}
