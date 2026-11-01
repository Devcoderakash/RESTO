/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#191816',
          dark: '#11100E',
          hover: '#24221F',
          active: '#2C2A26',
          border: '#2E2B26',
          text: '#F5F3ED',
          muted: '#949088',
        },
        canvas: {
          DEFAULT: '#FAF9F5',
          alt: '#F4F2EC',
        },
        card: {
          DEFAULT: '#FFFFFF',
          hover: '#FCFBF8',
          border: '#E8E5DF',
        },
        brand: {
          DEFAULT: '#C5A265',
          light: '#DEC391',
          dark: '#9E7E44',
          subtle: '#FAF7F0',
          border: '#E8DCBF',
          50: '#FAF7F0',
          100: '#F4EEDF',
          200: '#E8DCBF',
          300: '#D9C59B',
          400: '#C5A265',
          500: '#B5904F',
          600: '#9E7E44',
          700: '#846738',
          800: '#68502E',
          900: '#4D3B23',
        },
        charcoal: {
          DEFAULT: '#191816',
          soft: '#2E2C28',
          muted: '#736F68',
          light: '#C7C3BB',
        },
        beige: {
          DEFAULT: '#E8E5DF',
          light: '#F4F2EC',
          dark: '#D5D1C7',
        },
        emerald: {
          DEFAULT: '#0E3A2F',
          50: '#F0FDF4',
          100: '#DCFCE7',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
        },
        status: {
          success: {
            bg: '#F0FDF4',
            text: '#15803D',
            border: '#BBF7D0',
          },
          warning: {
            bg: '#FFFBEB',
            text: '#B45309',
            border: '#FDE68A',
          },
          danger: {
            bg: '#FEF2F2',
            text: '#B91C1C',
            border: '#FECACA',
          },
          info: {
            bg: '#F0F9FF',
            text: '#0369A1',
            border: '#BAE6FD',
          },
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
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
