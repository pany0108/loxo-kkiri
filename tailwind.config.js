/** @type {import('tailwindcss').Config} */
const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Pretendard'", ...fontFamily.sans],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
