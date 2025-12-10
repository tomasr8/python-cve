/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
      },
      colors: {
        'dark-bg': '#0a0e14',
        'dark-surface': '#141820',
        'dark-border': '#1f2430',
        'dark-text': '#e6e1dc',
        'dark-text-muted': '#8a8a8a',
        'accent-cyan': '#39bae6',
        'accent-blue': '#3b82f6',
        'accent-green': '#6cbf43',
        'accent-red': '#f07178',
        'accent-yellow': '#ffb454',
        // Python brand colors
        'python-blue': '#4B8BBE',
        'python-blue-dark': '#306998',
        'python-yellow': '#FFD43B',
        'python-yellow-light': '#FFE873',
      },
    },
  },
  plugins: [],
}
