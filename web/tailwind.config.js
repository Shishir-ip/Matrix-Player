/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nothing: {
          bg: 'var(--theme-bg)',
          surface1: 'var(--theme-surface1)',
          surface2: 'var(--theme-surface2)',
          surface3: 'var(--theme-surface3)',
          border: 'var(--theme-border)',
          borderHover: 'var(--theme-border-hover)',
          red: '#D71921',
          redGlow: 'rgba(215, 25, 33, 0.4)',
          text: 'var(--theme-text)',
          textMuted: 'var(--theme-text-muted)',
          textDim: 'var(--theme-text-dim)',
          lightBg: '#F2F2F2',
          lightSurface: '#E5E5E5',
          lightBorder: '#D0D0D0',
          lightText: '#111111',
          lightMuted: '#666666'
        }
      },
      fontFamily: {
        doto: ['"Doto"', 'monospace'],
        mono: ['"Space Mono"', 'monospace'],
        sans: ['"Space Grotesk"', 'sans-serif'],
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
        'dot-grid-light': 'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)',
        'dot-grid-red': 'radial-gradient(circle, rgba(215,25,33,0.3) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dots-sm': '16px 16px',
        'dots-md': '24px 24px',
        'dots-lg': '32px 32px',
      },
      borderRadius: {
        'nothing': '24px',
        'nothing-sm': '16px',
        'nothing-lg': '32px',
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'red-blink': 'redBlink 1.2s infinite',
        'matrix-scan': 'matrixScan 3s linear infinite',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        redBlink: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.3', transform: 'scale(0.85)' },
        },
        matrixScan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
