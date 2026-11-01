/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FAF9F5',
          alt: '#F4F2EC',
        },
        cream: {
          50: '#FDFCF9',
          100: '#FAF9F5',
          200: '#F4F2EC',
          300: '#E8E5DF',
          400: '#D8D4CA',
        },
        charcoal: {
          DEFAULT: '#191816',
          50: '#F8F7F5',
          100: '#EAE8E4',
          200: '#CCC8C0',
          600: '#736F68',
          700: '#48453F',
          800: '#2C2A26',
          900: '#191816',
          950: '#11100E',
        },
        emerald: {
          DEFAULT: '#0E3A2F',
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#0E3A2F',
          950: '#062019',
        },
        gold: {
          DEFAULT: '#C5A265',
          light: '#DEC391',
          dark: '#9E7E44',
          50: '#FAF7F0',
          100: '#F4EEDF',
          200: '#E8DCBF',
          300: '#D9C59B',
          500: '#C5A265',
          600: '#AE8B4E',
          700: '#8E6E37',
        },
        beige: {
          DEFAULT: '#E8E5DF',
          light: '#F4F2EC',
          dark: '#D5D1C7',
        },
        veg: {
          DEFAULT: '#15803D',
          light: '#F0FDF4',
          border: '#86EFAC',
        },
        nonveg: {
          DEFAULT: '#B91C1C',
          light: '#FEF2F2',
          border: '#FCA5A5',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(25, 24, 22, 0.04)',
        'medium': '0 6px 20px rgba(25, 24, 22, 0.07)',
        'elevated': '0 12px 36px rgba(25, 24, 22, 0.12)',
        'gold-glow': '0 4px 20px rgba(197, 162, 101, 0.25)',
        'emerald-glow': '0 4px 20px rgba(14, 58, 47, 0.22)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
