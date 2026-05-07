/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#030711',
          900: '#0a0f1e',
          800: '#111827',
          700: '#1a2332',
          600: '#243044',
        },
        brand: {
          DEFAULT: '#6366f1',
          bright: '#818cf8',
          dim: '#4f46e5',
          50: '#eef2ff',
        },
        accent: {
          orange: '#f59e0b',
          'orange-soft': '#fbbf24',
          emerald: '#10b981',
          cyan: '#06b6d4',
        },
        status: {
          red: '#ef4444',
          green: '#22c55e',
          amber: '#f59e0b',
        },
        muted: '#64748b',
        border: '#1e293b',
        surface: '#111827',
        ink: '#f1f5f9',
        'ink-secondary': '#94a3b8',
        priority: {
          acil: '#ff1744',
          kritik: '#ef4444',
          yuksek: '#f59e0b',
          orta: '#eab308',
          dusuk: '#6366f1',
          none: '#64748b',
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(99,102,241,0.15)',
        brand: '0 4px 24px rgba(99,102,241,0.25)',
        card: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)',
        sidebar: '4px 0 24px rgba(0,0,0,0.3)',
      },
      keyframes: {
        popIn: {
          from: { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        popIn: 'popIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        fadeIn: 'fadeIn 0.2s ease',
        slideIn: 'slideIn 0.3s ease',
        slideRight: 'slideRight 0.25s cubic-bezier(0.16,1,0.3,1)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4f46e5, #6366f1, #818cf8)',
        'brand-gradient-hover': 'linear-gradient(135deg, #6366f1, #818cf8)',
        'surface-gradient': 'linear-gradient(180deg, #111827, #0a0f1e)',
        'card-gradient': 'linear-gradient(135deg, rgba(30,41,59,0.5), rgba(17,24,39,0.8))',
      },
    },
  },
  plugins: [],
};
