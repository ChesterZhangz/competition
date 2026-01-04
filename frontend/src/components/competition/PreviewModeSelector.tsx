import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type PreviewMode = 'style' | 'simulate' | 'edit';

interface PreviewModeSelectorProps {
  value: PreviewMode;
  onChange: (mode: PreviewMode) => void;
  className?: string;
}

interface ModeOption {
  id: PreviewMode;
  icon: React.ReactNode;
}

export function PreviewModeSelector({ value, onChange, className }: PreviewModeSelectorProps) {
  const { t } = useTranslation();

  const modes: ModeOption[] = [
    {
      id: 'style',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      ),
    },
    {
      id: 'simulate',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
    },
    {
      id: 'edit',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className={cn('flex gap-2', className)}>
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onChange(mode.id)}
          className={cn(
            'flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
            value === mode.id
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
              : 'border-[var(--color-border)] hover:border-[var(--color-muted)] hover:bg-[var(--color-secondary)]'
          )}
        >
          <div
            className={cn(
              value === mode.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
            )}
          >
            {mode.icon}
          </div>
          <span
            className={cn(
              'text-sm font-medium',
              value === mode.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-foreground)]'
            )}
          >
            {mode.id === 'style' && t('competition.preview.styleMode', 'Style Preview')}
            {mode.id === 'simulate' && t('competition.preview.simulateMode', 'Simulate Flow')}
            {mode.id === 'edit' && t('competition.preview.editMode', 'Edit & Preview')}
          </span>
          <p className="text-center text-xs text-[var(--color-muted)]">
            {mode.id === 'style' && t('competition.preview.styleModeDesc', 'View the visual appearance')}
            {mode.id === 'simulate' && t('competition.preview.simulateModeDesc', 'Test the full competition flow')}
            {mode.id === 'edit' && t('competition.preview.editModeDesc', 'Real-time editing with preview')}
          </p>
        </button>
      ))}
    </div>
  );
}
