/** @type {import('tailwindcss').Config} */
const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Pretendard'", ...fontFamily.sans],
      },
      colors: {
        primary: '#007AFF',
        main: '#191F28',
        sub: '#8B95A1',
      },
      borderRadius: {
        sm: '10px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '28px',
        '4xl': '32px',
      },
      spacing: {
        page: '24px', // 공통 페이지 좌우 패딩 (기존 px-6 대체)
      },
      boxShadow: {
        card: '0 4px 20px rgba(0, 0, 0, 0.05)',
      },
      zIndex: {
        nav: '40',
        header: '50',
        modal: '60',
      },
      transitionTimingFunction: {
        'sheet-ease': 'cubic-bezier(0.33, 1, 0.68, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
