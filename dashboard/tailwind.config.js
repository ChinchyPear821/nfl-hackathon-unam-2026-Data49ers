/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: '#0F171E',
        superficie: '#1A242F',
        borde: '#2A3744',
        acento: '#00A8E1',
        secundario: '#8197A4',
        primerdown: '#FFD400',
        completo: '#1FBF6B',
        fallo: '#E5484D',
      },
      fontFamily: {
        // fuentes del sistema, sin CDN
        display: ['"Arial Narrow"', '"Roboto Condensed"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
