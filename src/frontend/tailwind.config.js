/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0a1628',
          800: '#0d2040',
          700: '#112a55',
          600: '#163570',
        },
        teal: {
          500: '#0891b2',
          400: '#22d3ee',
          300: '#67e8f9',
        },
      },
    },
  },
  plugins: [],
}
