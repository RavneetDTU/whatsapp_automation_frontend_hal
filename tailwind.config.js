/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        brand: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
        },
        indigo: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        whatsapp: {
          DEFAULT: '#10B981', // Brand Emerald / WhatsApp green
          brand: '#25D366',
          light: '#ECFDF5',
          bubble: '#DCF8C6',
          bubbleBorder: '#C5E8AC',
          dark: '#059669',
        },
        canvas: '#F8FAFC',
        card: '#FFFFFF',
        sidebar: {
          bg: '#7F1D1D',
          hover: '#991B1B',
          active: '#991B1B',
          border: '#450A0A',
          text: '#FECACA',
          'text-active': '#FFFFFF',
        },
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'elevated': '0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        'popover': '0 12px 28px -4px rgba(15, 23, 42, 0.12), 0 6px 12px -4px rgba(15, 23, 42, 0.08)',
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'spin-slow': 'spin 1.5s linear infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
