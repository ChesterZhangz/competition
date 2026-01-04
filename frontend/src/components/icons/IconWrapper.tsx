import { forwardRef, type ReactNode, type SVGProps } from 'react';
import { cn } from '@/lib/utils';
import type { IconState } from './types';

interface IconWrapperProps extends SVGProps<SVGSVGElement> {
  size?: number;
  state?: IconState;
  children: ReactNode;
}

export const IconWrapper = forwardRef<SVGSVGElement, IconWrapperProps>(
  ({ size = 24, state = 'idle', className, children, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          'transition-all duration-200',
          {
            'opacity-100': state === 'idle',
            'opacity-90 scale-105': state === 'hover',
            'opacity-100 scale-95': state === 'active',
            'opacity-70 animate-pulse': state === 'loading',
          },
          className
        )}
        {...props}
      >
        {children}
      </svg>
    );
  }
);

IconWrapper.displayName = 'IconWrapper';
