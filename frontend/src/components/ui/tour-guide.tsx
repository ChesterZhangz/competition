import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface TourStep {
  /** CSS selector or ref for the target element */
  target: string;
  /** Translation key for the title */
  titleKey: string;
  /** Translation key for the description */
  descriptionKey: string;
  /** Fallback title if translation not found */
  title?: string;
  /** Fallback description if translation not found */
  description?: string;
  /** Position of the tooltip relative to target */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Optional action to perform when reaching this step */
  onEnter?: () => void;
  /** Optional action when leaving this step */
  onLeave?: () => void;
}

interface TourGuideProps {
  /** Array of tour steps */
  steps: TourStep[];
  /** Whether the tour is active */
  isOpen: boolean;
  /** Callback when tour is closed or completed */
  onClose: () => void;
  /** Callback when tour is completed (reached the end) */
  onComplete?: () => void;
  /** Starting step index */
  startStep?: number;
  /** Custom class for the overlay */
  overlayClassName?: string;
  /** Whether to show step indicator */
  showStepIndicator?: boolean;
  /** Highlight padding around target element */
  highlightPadding?: number;
}

export function TourGuide({
  steps,
  isOpen,
  onClose,
  onComplete,
  startStep = 0,
  showStepIndicator = true,
  highlightPadding = 8,
}: TourGuideProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(startStep);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  // Find and measure target element
  const measureTarget = useCallback(() => {
    if (!step?.target) return;

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [step?.target]);

  // Calculate tooltip position
  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 16;

    let placement = step?.placement || 'auto';

    // Auto-determine best placement
    if (placement === 'auto') {
      const spaceAbove = targetRect.top;
      const spaceBelow = window.innerHeight - targetRect.bottom;
      const spaceRight = window.innerWidth - targetRect.right;

      if (spaceBelow >= tooltipRect.height + padding) {
        placement = 'bottom';
      } else if (spaceAbove >= tooltipRect.height + padding) {
        placement = 'top';
      } else if (spaceRight >= tooltipRect.width + padding) {
        placement = 'right';
      } else {
        placement = 'left';
      }
    }

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = targetRect.top - tooltipRect.height - padding;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - padding;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + padding;
        break;
    }

    // Keep tooltip within viewport
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));

    setTooltipPosition({ top, left });
  }, [targetRect, step?.placement]);

  // Re-measure on step change
  useEffect(() => {
    if (isOpen) {
      measureTarget();
      step?.onEnter?.();
    }
  }, [isOpen, currentStep, measureTarget, step]);

  // Re-measure on resize
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => measureTarget();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, measureTarget]);

  const handleNext = useCallback(() => {
    step?.onLeave?.();
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete?.();
      onClose();
    }
  }, [step, currentStep, steps.length, onComplete, onClose]);

  const handlePrev = useCallback(() => {
    step?.onLeave?.();
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [step, currentStep]);

  const handleSkip = useCallback(() => {
    step?.onLeave?.();
    onClose();
  }, [step, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]">
        {/* Overlay with spotlight effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={handleSkip}
        >
          {/* Dark overlay with cutout for target */}
          <svg className="absolute inset-0 h-full w-full">
            <defs>
              <mask id="tour-spotlight">
                <rect width="100%" height="100%" fill="white" />
                {targetRect && (
                  <rect
                    x={targetRect.left - highlightPadding}
                    y={targetRect.top - highlightPadding}
                    width={targetRect.width + highlightPadding * 2}
                    height={targetRect.height + highlightPadding * 2}
                    rx={12}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#tour-spotlight)"
            />
          </svg>

          {/* Highlight border around target */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute rounded-xl border-2 border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/30"
              style={{
                left: targetRect.left - highlightPadding,
                top: targetRect.top - highlightPadding,
                width: targetRect.width + highlightPadding * 2,
                height: targetRect.height + highlightPadding * 2,
              }}
            />
          )}
        </motion.div>

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute z-10 max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-2xl"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Step indicator */}
          {showStepIndicator && (
            <div className="mb-3 flex items-center gap-1.5">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === currentStep
                      ? 'w-6 bg-[var(--color-primary)]'
                      : index < currentStep
                      ? 'w-1.5 bg-[var(--color-primary)]/50'
                      : 'w-1.5 bg-[var(--color-border)]'
                  )}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <h3 className="mb-2 text-lg font-semibold text-[var(--color-foreground)]">
            {t(step?.titleKey || '', step?.title || '')}
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-[var(--color-muted)]">
            {t(step?.descriptionKey || '', step?.description || '')}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
            >
              {t('tour.skip', 'Skip')}
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--color-secondary)]"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  {t('tour.prev', 'Back')}
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90"
              >
                {currentStep === steps.length - 1
                  ? t('tour.finish', 'Finish')
                  : t('tour.next', 'Next')}
                {currentStep < steps.length - 1 && <ChevronRightIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

// Icons
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// Tour trigger button component
interface TourTriggerProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

export function TourTrigger({ onClick, className, label }: TourTriggerProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm font-medium transition-all hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]',
        className
      )}
    >
      <HelpCircleIcon className="h-4 w-4" />
      {label || t('tour.startTour', 'Take a Tour')}
    </button>
  );
}

function HelpCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
