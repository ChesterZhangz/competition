import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { type CompetitionMode } from '@/types/competition';

interface ModeSelectorProps {
  value: CompetitionMode;
  onChange: (mode: CompetitionMode) => void;
  className?: string;
}

export function ModeSelector({ value, onChange, className }: ModeSelectorProps) {
  const { t } = useTranslation();

  const modes = [
    {
      id: 'onsite' as CompetitionMode,
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="4" />
          <path d="M6 18v2M18 18v2" />
          <circle cx="6" cy="9" r="1" fill="currentColor" />
        </svg>
      ),
      nameKey: 'competition.mode.onsiteTitle',
      descKey: 'competition.mode.onsiteDesc',
      features: [
        'competition.mode.onsiteFeature1',
        'competition.mode.onsiteFeature2',
        'competition.mode.onsiteFeature3',
      ],
      recommended: 'competition.mode.onsiteRecommended',
    },
    {
      id: 'online' as CompetitionMode,
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
          <path d="M6 8h4M6 11h8" />
        </svg>
      ),
      nameKey: 'competition.mode.onlineTitle',
      descKey: 'competition.mode.onlineDesc',
      features: [
        'competition.mode.onlineFeature1',
        'competition.mode.onlineFeature2',
        'competition.mode.onlineFeature3',
      ],
      recommended: 'competition.mode.onlineRecommended',
    },
  ];

  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {modes.map((mode) => {
        const isSelected = value === mode.id;

        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={cn(
              'group relative flex flex-col rounded-2xl border-2 p-5 text-left transition-all',
              isSelected
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg shadow-[var(--color-primary)]/10'
                : 'border-[var(--color-border)] hover:border-[var(--color-muted)] hover:bg-[var(--color-secondary)]/50'
            )}
          >
            {/* Selection Indicator */}
            <div
              className={cn(
                'absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                  : 'border-[var(--color-border)]'
              )}
            >
              {isSelected && (
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>

            {/* Icon & Title */}
            <div className="mb-4 flex items-center gap-3">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
                  isSelected
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-secondary)] text-[var(--color-muted)] group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)]'
                )}
              >
                {mode.icon}
              </div>
              <div>
                <h3
                  className={cn(
                    'text-lg font-semibold transition-colors',
                    isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-foreground)]'
                  )}
                >
                  {t(mode.nameKey, mode.id === 'onsite' ? 'On-Site Mode' : 'Online Mode')}
                </h3>
                <p className="text-xs text-[var(--color-muted)]">
                  {t(mode.recommended, mode.id === 'onsite' ? 'Best for in-person events' : 'Best for remote competitions')}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="mb-4 text-sm text-[var(--color-muted)]">
              {t(mode.descKey, mode.id === 'onsite' ? 'Host controls the competition flow' : 'Automated competition flow')}
            </p>

            {/* Features List */}
            <ul className="space-y-2">
              {mode.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
                  <svg
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-success)]'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t(
                    feature,
                    index === 0
                      ? mode.id === 'onsite'
                        ? 'Real-time host control'
                        : 'Self-paced participation'
                      : index === 1
                      ? mode.id === 'onsite'
                        ? 'Large display support'
                        : 'Automatic timing'
                      : mode.id === 'onsite'
                      ? 'QR code join'
                      : 'Team support'
                  )}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
