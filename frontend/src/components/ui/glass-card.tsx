import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle';
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border transition-all duration-200',
          'bg-[var(--color-card)]',
          'border-[var(--color-border)]',
          {
            'shadow-lg dark:shadow-none': variant === 'default',
            'shadow-xl hover:shadow-2xl dark:shadow-none': variant === 'elevated',
            'shadow-sm dark:shadow-none': variant === 'subtle',
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard };
