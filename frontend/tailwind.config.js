/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCF9',
          100: '#FAF8F3',
          200: '#F3EFE6',
          300: '#E9E4DA',
          400: '#D8D1C3',
        },
        charcoal: {
          DEFAULT: '#22211F',
          50: '#F7F6F5',
          100: '#E5E3DF',
          200: '#C7C3BD',
          600: '#77736D',
          700: '#4A4844',
          800: '#2E2D2B',
          900: '#22211F',
          950: '#141312',
        },
        gold: {
          DEFAULT: '#B99A62',
          light: '#D3BA8D',
          dark: '#937844',
          50: '#FAF6EE',
          100: '#F5ECDB',
          200: '#E8D4B0',
          300: '#DCBD86',
          500: '#B99A62',
          600: '#9C7F48',
          700: '#7E6333',
        },
        beige: {
          DEFAULT: '#E9E4DA',
          light: '#F4F1EA',
          dark: '#D8D0C0',
        },
        veg: {
          DEFAULT: '#2E7D32',
          light: '#E8F5E9',
          border: '#81C784',
        },
        nonveg: {
          DEFAULT: '#C62828',
          light: '#FFEBEE',
          border: '#E57373',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(34, 33, 31, 0.05)',
        'medium': '0 10px 30px -4px rgba(34, 33, 31, 0.08)',
        'elevated': '0 20px 40px -6px rgba(34, 33, 31, 0.12)',
        'gold-glow': '0 4px 24px -2px rgba(185, 154, 98, 0.25)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
