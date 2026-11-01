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
        // DineFlow Theme Palette
        sidebar: {
          DEFAULT: '#201F1C',
          dark: '#171614',
          hover: '#2A2925',
          active: '#34322E',
          border: '#33312C',
          text: '#F3F1EC',
          muted: '#9E9B93',
        },
        canvas: {
          DEFAULT: '#F8F7F3', // Warm Off-White main background
          alt: '#F2EFE8',
        },
        card: {
          DEFAULT: '#FFFFFF',
          hover: '#FCFBF8',
          border: '#EAE7DF',
        },
        brand: {
          DEFAULT: '#B99A62', // Champagne Gold
          light: '#D3BA8D',
          dark: '#9A7D45',
          subtle: '#F7F3EA',
          border: '#E2D5BE',
          50: '#FBF9F4',
          100: '#F5EFE1',
          200: '#EBDDBF',
          300: '#DDC698',
          400: '#CBAD72',
          500: '#B99A62',
          600: '#A48249',
          700: '#846738',
          800: '#68502E',
          900: '#4D3B23',
        },
        charcoal: {
          DEFAULT: '#252421', // Dark Charcoal primary text
          soft: '#3A3833',
          muted: '#85827A',  // Secondary Muted Grey text
          light: '#C4C0B6',
        },
        beige: {
          DEFAULT: '#EAE7DF', // Soft Beige border
          light: '#F5F3ED',
          dark: '#DBD6C9',
        },
        // Semantic status colors
        status: {
          success: {
            DEFAULT: '#15803D',
            bg: '#F0FDF4',
            border: '#BBF7D0',
          },
          warning: {
            DEFAULT: '#B45309',
            bg: '#FFFBEB',
            border: '#FDE68A',
          },
          danger: {
            DEFAULT: '#B91C1C',
            bg: '#FEF2F2',
            border: '#FECACA',
          },
          info: {
            DEFAULT: '#0369A1',
            bg: '#F0F9FF',
            border: '#BAE6FD',
          },
          purple: {
            DEFAULT: '#6D28D9',
            bg: '#F5F3FF',
            border: '#DDD6FE',
          },
        },
        veg: {
          DEFAULT: '#16A34A',
          bg: '#F0FDF4',
          border: '#86EFAC',
        },
        nonveg: {
          DEFAULT: '#DC2626',
          bg: '#FEF2F2',
          border: '#FCA5A5',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(37, 36, 33, 0.04), 0 1px 2px -1px rgba(37, 36, 33, 0.03)',
        'card-hover': '0 8px 24px -4px rgba(37, 36, 33, 0.08), 0 2px 6px -1px rgba(37, 36, 33, 0.03)',
        'dropdown': '0 10px 30px -4px rgba(32, 31, 28, 0.12), 0 4px 12px -2px rgba(32, 31, 28, 0.06)',
        'modal': '0 25px 50px -12px rgba(32, 31, 28, 0.25)',
        'gold-glow': '0 0 0 3px rgba(185, 154, 98, 0.2)',
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}

