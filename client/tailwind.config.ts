import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: '#1B5E35',
        feltLight: '#236B43',
        feltDark: '#133D24',
        teamA: '#3B82F6',
        teamALight: '#93C5FD',
        teamB: '#EF4444',
        teamBLight: '#FCA5A5',
        cardFace: '#FEFCE8',
        hearts: '#DC2626',
        diamonds: '#DC2626',
        clubs: '#1E293B',
        spades: '#1E293B',
        gold: '#F59E0B',
      },
      fontFamily: {
        card: ['"Playfair Display"', 'serif'],
        ui: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)',
        'card-hover': '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.2)',
        table: 'inset 0 0 60px rgba(0,0,0,0.3)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'bounce-subtle': 'bounce 2s ease-in-out infinite',
        'glow-pulse': 'glow 2s ease-in-out infinite',
        shake: 'shake 0.4s ease-in-out',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 8px 2px currentColor' },
          '50%': { boxShadow: '0 0 20px 6px currentColor' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
