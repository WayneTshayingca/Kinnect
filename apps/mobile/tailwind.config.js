/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          300: '#A5B4FC',
          500: '#4F46E5',
          600: '#312E81',
          700: '#2A2770',
          800: '#1E1B4B',
          900: '#171538',
        },
        accent: {
          50:  '#FFF5F6',
          400: '#FB8A95',
          500: '#FB7185',
          600: '#F43F5E',
          700: '#E11D48',
        },
        success: {
          400: '#4ADE80',
          500: '#34D399',
          600: '#10B981',
        },
      },
    },
  },
  plugins: [],
}
