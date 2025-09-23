/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        festiveRed: '#b71c1c',
        festiveOrange: '#ef6c00',
        festiveGold: '#c9a227',
      },
      boxShadow: {
        card: '0 4px 16px rgba(0,0,0,0.08)'
      }
    },
  },
  plugins: [],
}


