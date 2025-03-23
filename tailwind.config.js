/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        wider: '0.1em',
      },
      colors: {
        dark: {
          DEFAULT: '#000000',
          100: '#0A0A0A',
          200: '#1A1A1A',
          300: '#2A2A2A',
          400: '#3A3A3A',
        },
      },
    },
  },
  plugins: [],
};