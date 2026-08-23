/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {
      colors: {
        // Teal/petróleo — cor primária, extraída do "V" esquerdo e da wordmark do logo VIZI.
        brand: {
          50:  'oklch(0.96 0.020 195)',
          100: 'oklch(0.91 0.045 195)',
          200: 'oklch(0.83 0.070 195)',
          300: 'oklch(0.72 0.090 195)',
          400: 'oklch(0.62 0.110 195)',
          500: 'oklch(0.52 0.120 195)',
          600: 'oklch(0.44 0.110 195)',
          700: 'oklch(0.36 0.095 195)',
          800: 'oklch(0.27 0.075 195)',
          900: 'oklch(0.19 0.050 195)',
        },
        // Laranja/âmbar — cor secundária, extraída do "V" direito do logo. Uso reservado (CTAs, destaques).
        accent: {
          50:  'oklch(0.97 0.030 55)',
          100: 'oklch(0.93 0.060 55)',
          200: 'oklch(0.86 0.090 50)',
          300: 'oklch(0.78 0.120 48)',
          400: 'oklch(0.70 0.150 45)',
          500: 'oklch(0.62 0.170 40)',
          600: 'oklch(0.55 0.160 38)',
          700: 'oklch(0.46 0.140 35)',
          800: 'oklch(0.36 0.110 32)',
          900: 'oklch(0.26 0.080 30)',
        },
        cream: {
          50:  'oklch(0.985 0.006 60)',
          100: 'oklch(0.965 0.008 60)',
          200: 'oklch(0.93 0.010 60)',
        },
        ink: {
          50:  'oklch(0.95 0.006 200)',
          400: 'oklch(0.55 0.012 200)',
          500: 'oklch(0.45 0.012 200)',
          600: 'oklch(0.35 0.012 200)',
          700: 'oklch(0.28 0.012 200)',
          900: 'oklch(0.18 0.010 200)',
        },
      },
      fontFamily: {
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}