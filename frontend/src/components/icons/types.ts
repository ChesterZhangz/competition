import type { SVGProps } from 'react';

export type IconState = 'idle' | 'hover' | 'active' | 'loading';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  state?: IconState;
  animated?: boolean;
}
