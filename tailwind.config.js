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
      transitionTimingFunction: {
        'sheet-ease': 'cubic-bezier(0.33, 1, 0.68, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
