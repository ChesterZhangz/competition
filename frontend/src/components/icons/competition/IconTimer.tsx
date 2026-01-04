import { forwardRef } from 'react';
import { IconWrapper } from '../IconWrapper';
import type { IconProps } from '../types';
import { cn } from '@/lib/utils';

export const IconTimer = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, state = 'idle', animated = false, className, ...props }, ref) => {
    return (
      <IconWrapper
        ref={ref}
        size={size}
        state={state}
        className={cn(animated && 'animate-pulse', className)}
        {...props}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </IconWrapper>
    );
  }
);

IconTimer.displayName = 'IconTimer';
