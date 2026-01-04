import { forwardRef } from 'react';
import { IconWrapper } from '../IconWrapper';
import type { IconProps } from '../types';

export const IconCheckCircle = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, state = 'idle', ...props }, ref) => {
    return (
      <IconWrapper ref={ref} size={size} state={state} {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </IconWrapper>
    );
  }
);

IconCheckCircle.displayName = 'IconCheckCircle';
