/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'teal-primary': '#14B8A6',
        'teal-secondary': '#0D9488',
      },
    },
  },
  plugins: [],
}