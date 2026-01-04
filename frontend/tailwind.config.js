/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary: Cyan
        primary: {
          50: '#e6fafb',
          100: '#b3f0f3',
          200: '#80e5ec',
          300: '#4ddae4',
          400: '#2cb1bc',
          500: '#2cb1bc', // Main primary
          600: '#238e96',
          700: '#1a6b71',
          800: '#12484b',
          900: '#092526',
        },
        // Semantic colors
        success: {
          light: '#10b981',
          dark: '#34d399',
        },
        warning: {
          light: '#f59e0b',
          dark: '#fbbf24',
        },
        error: {
          light: '#ef4444',
          dark: '#f87171',
        },
        // Glass background colors
        glass: {
          light: 'rgba(255, 255, 255, 0.7)',
          dark: 'rgba(255, 255, 255, 0.05)',
        },
      },
      backgroundColor: {
        'app-light': '#ffffff',
        'app-dark': '#000000',
      },
      backdropBlur: {
        glass: '12px',
      },
      boxShadow: {
        'glass-light': '0 4px 30px rgba(0, 0, 0, 0.1)',
        'glass-dark': '0 4px 30px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
