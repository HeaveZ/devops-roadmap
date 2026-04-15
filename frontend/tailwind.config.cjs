/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Syne', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          900: '#050d1a',
          800: '#0a1628',
          700: '#0f2040',
        },
        brand: {
          DEFAULT: '#2196F3',
          bright: '#42A5F5',
          dim: '#1565C0',
        },
        accent: {
          orange: '#FF6D00',
          'orange-soft': '#FF8C00',
        },
        status: {
          red: '#F44336',
          green: '#4CAF50',
        },
        muted: '#7B9BBF',
        border: '#1a3a5c',
        surface: '#0a1628',
        ink: '#E8F4FF',
        priority: {
          kritik: '#EF5350',
          yuksek: '#FF8C00',
          orta: '#FFD54F',
          dusuk: '#64B5F6',
          none: '#7B9BBF',
        },
      },
      boxShadow: {
        glow: '0 0 16px rgba(33,150,243,0.25)',
        brand: '0 4px 20px rgba(33,150,243,0.3)',
      },
      keyframes: {
        popIn: {
          from: { opacity: '0', transform: 'scale(0.9) translateY(20px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        popIn: 'popIn 0.3s ease',
        fadeIn: 'fadeIn 0.2s ease',
      },
      backgroundImage: {
        grid: `linear-gradient(rgba(33,150,243,0.04) 1px, transparent 1px),
               linear-gradient(90deg, rgba(33,150,243,0.04) 1px, transparent 1px)`,
        'brand-gradient': 'linear-gradient(135deg, #1565C0, #2196F3)',
        'brand-gradient-hover': 'linear-gradient(135deg, #2196F3, #42A5F5)',
      },
      backgroundSize: {
        grid: '40px 40px',
      },
    },
  },
  plugins: [],
};
