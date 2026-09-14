/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        portflow: {
          canvas: '#F7F4EE',
          surface: '#FFFFFF',
          ink: '#231F20',
          muted: '#6F6761',
          border: '#E7DED4',

          navy: '#213657',
          navyHover: '#2D4A73',

          amber: '#D99119',
          amberHover: '#B97710',
          amberSoft: '#FFF0D0',

          orange: '#D85F2B',
          orangeSoft: '#FDE6DB',

          purple: '#7656B8',
          purpleSoft: '#F1ECFB',

          green: '#2E7D5B',
          greenSoft: '#E3F3EA',

          red: '#C94B43',
          redSoft: '#FCE8E6',
        },
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
      borderRadius: {
        'panel': '28px',
        '3xl': '20px',
        '2xl': '16px',
        'xl': '12px',
        'lg': '10px',
        '28': '28px',
      },
      boxShadow: {
        'card': '0 10px 30px rgba(33, 54, 87, 0.08)',
        'card-hover': '0 14px 38px rgba(33, 54, 87, 0.14)',
        'sidebar': '8px 0 30px rgba(20, 30, 50, 0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
