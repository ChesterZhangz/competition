import { forwardRef } from 'react';
import { IconWrapper } from '../IconWrapper';
import type { IconProps } from '../types';

export const IconIntegral = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, state = 'idle', ...props }, ref) => {
    return (
      <IconWrapper ref={ref} size={size} state={state} {...props}>
        <path
          d="M7 4c0 1.5 1 3 3 3s3-1.5 3-3"
          strokeWidth="2.5"
        />
        <path
          d="M10 7v10"
          strokeWidth="2.5"
        />
        <path
          d="M7 20c0-1.5 1-3 3-3s3 1.5 3 3"
          strokeWidth="2.5"
        />
        <text
          x="16"
          y="10"
          fontSize="8"
          fill="currentColor"
          stroke="none"
          fontFamily="serif"
          fontStyle="italic"
        >
          dx
        </text>
      </IconWrapper>
    );
  }
);

IconIntegral.displayName = 'IconIntegral';
