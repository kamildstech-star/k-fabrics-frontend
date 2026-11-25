import type { Config } from 'tailwindcss'

export default <Config>{
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          white: '#FFFFFF',
          cream: '#F9F8F6',
          charcoal: '#1A1A1A',
          muted: '#6B6B6B',
          gold: '#B89B5E',
          'gold-light': '#D4AF37',
          border: '#E5E5E5',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display Variable"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans Variable"', 'sans-serif'],
      },
      letterSpacing: {
        luxury: '0.15em',
      },
    },
  },
  plugins: [],
}
