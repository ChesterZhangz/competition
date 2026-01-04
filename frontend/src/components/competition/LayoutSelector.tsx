import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { LayoutType } from '@/types/competition';

interface LayoutSelectorProps {
  value: LayoutType;
  onChange: (layout: LayoutType) => void;
  className?: string;
}

interface LayoutOption {
  id: LayoutType;
  icon: React.ReactNode;
}

export function LayoutSelector({ value, onChange, className }: LayoutSelectorProps) {
  const { t } = useTranslation();

  const layouts: LayoutOption[] = [
    {
      id: 'single',
      icon: (
        <svg viewBox="0 0 48 36" className="h-full w-full">
          <rect x="4" y="4" width="40" height="28" rx="2" fill="currentColor" opacity="0.2" />
          <rect x="8" y="8" width="32" height="20" rx="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'grid',
      icon: (
        <svg viewBox="0 0 48 36" className="h-full w-full">
          <rect x="4" y="4" width="40" height="28" rx="2" fill="currentColor" opacity="0.2" />
          <rect x="6" y="6" width="16" height="11" rx="1" fill="currentColor" />
          <rect x="26" y="6" width="16" height="11" rx="1" fill="currentColor" />
          <rect x="6" y="19" width="16" height="11" rx="1" fill="currentColor" />
          <rect x="26" y="19" width="16" height="11" rx="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'list',
      icon: (
        <svg viewBox="0 0 48 36" className="h-full w-full">
          <rect x="4" y="4" width="40" height="28" rx="2" fill="currentColor" opacity="0.2" />
          <rect x="6" y="6" width="36" height="7" rx="1" fill="currentColor" />
          <rect x="6" y="15" width="36" height="7" rx="1" fill="currentColor" />
          <rect x="6" y="24" width="36" height="7" rx="1" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-sm font-medium text-[var(--color-foreground)]">
        {t('competition.display.layout', 'Layout')}
      </label>
      <div className="grid grid-cols-3 gap-3">
        {layouts.map((layout) => (
          <button
            key={layout.id}
            type="button"
            onClick={() => onChange(layout.id)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
              value === layout.id
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                : 'border-[var(--color-border)] hover:border-[var(--color-muted)] hover:bg-[var(--color-secondary)]'
            )}
          >
            <div
              className={cn(
                'h-12 w-16',
                value === layout.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
              )}
            >
              {layout.icon}
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                value === layout.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-foreground)]'
              )}
            >
              {t(`competition.display.layout${layout.id.charAt(0).toUpperCase() + layout.id.slice(1)}`, layout.id)}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-[var(--color-muted)]">
        {value === 'single' && t('competition.display.layoutSingleDesc', 'Display one question at a time, full screen. Best for on-site projection.')}
        {value === 'grid' && t('competition.display.layoutGridDesc', 'Display multiple questions in a grid. Best for online competitions.')}
        {value === 'list' && t('competition.display.layoutListDesc', 'Display questions in a scrollable list. Best for practice mode.')}
      </p>
    </div>
  );
}
