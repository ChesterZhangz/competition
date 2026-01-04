import { forwardRef } from 'react';
import { IconWrapper } from '../IconWrapper';
import type { IconProps } from '../types';

export const IconXCircle = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, state = 'idle', ...props }, ref) => {
    return (
      <IconWrapper ref={ref} size={size} state={state} {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </IconWrapper>
    );
  }
);

IconXCircle.displayName = 'IconXCircle';
