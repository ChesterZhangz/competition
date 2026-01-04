import { useState } from 'react';

interface MareatLogoProps {
  size?: number;
  className?: string;
}

export function MareateLogo({ size = 32, className = '' }: MareatLogoProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Glow filter */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer rotating ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="var(--color-primary)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="20 10"
          style={{
            transformOrigin: '50px 50px',
            animation: isHovered ? 'spin 8s linear infinite' : 'none',
          }}
        />

        {/* Inner pulsing circle */}
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1.5"
          opacity={isHovered ? 0.8 : 0.4}
          className={isHovered ? 'animate-pulse' : ''}
        />

        {/* Main M shape */}
        <g filter={isHovered ? 'url(#glow)' : ''}>
          <path
            d="M25 70 L25 35 L38 55 L50 35 L62 55 L75 35 L75 70"
            stroke="var(--color-primary)"
            strokeWidth={isHovered ? 6 : 5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="transition-all duration-300"
          />
        </g>

        {/* Decorative dots */}
        <circle
          cx="50"
          cy="22"
          r="3"
          fill="var(--color-primary)"
          opacity={isHovered ? 1 : 0.5}
          className="transition-opacity duration-300"
        >
          {isHovered && (
            <animate
              attributeName="r"
              values="3;4;3"
              dur="1s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        <circle
          cx="22"
          cy="50"
          r="2.5"
          fill="var(--color-primary)"
          opacity={isHovered ? 1 : 0.4}
          className="transition-opacity duration-300"
        >
          {isHovered && (
            <animate
              attributeName="r"
              values="2.5;3.5;2.5"
              dur="1.2s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        <circle
          cx="78"
          cy="50"
          r="2.5"
          fill="var(--color-primary)"
          opacity={isHovered ? 1 : 0.4}
          className="transition-opacity duration-300"
        >
          {isHovered && (
            <animate
              attributeName="r"
              values="2.5;3.5;2.5"
              dur="1.4s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* Bottom accent */}
        <path
          d="M35 78 Q50 85 65 78"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity={isHovered ? 1 : 0.5}
          className="transition-opacity duration-300"
        />
      </svg>

      {/* Subtle glow effect on hover */}
      <div
        className={`absolute inset-0 rounded-full bg-[var(--color-primary)] blur-xl transition-opacity duration-500 ${
          isHovered ? 'opacity-15' : 'opacity-0'
        }`}
        style={{ transform: 'scale(1.2)' }}
      />
    </div>
  );
}
