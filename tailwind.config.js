import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16294D',
        'ink-deep': '#102038',
        primary: '#1E4C8A',
        success: '#2F7D5F',
        warning: '#C2841A',
        danger: '#B0473A',
        text: {
          DEFAULT: '#354052',
          mut: '#5A6675',
          soft: '#8B95A4',
        },
        border: '#E2E7EE',
        surface: '#FFFFFF',
        bg: '#FAFBFD',
      },
      fontFamily: {
        heading: ['Archivo', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        card: '8px',
        chip: '3px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(22, 41, 77, 0.06)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
