import { forwardRef } from 'react';
import { IconWrapper } from '../IconWrapper';
import type { IconProps } from '../types';

export const IconMegaphone = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, state = 'idle', ...props }, ref) => {
    return (
      <IconWrapper ref={ref} size={size} state={state} {...props}>
        <path d="m3 11 18-5v12L3 13v-2z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </IconWrapper>
    );
  }
);

IconMegaphone.displayName = 'IconMegaphone';
