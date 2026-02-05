/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Terminal-inspired dark theme
        terminal: {
          bg: '#1e1e1e',
          surface: '#252526',
          border: '#3c3c3c',
          text: '#cccccc',
          'text-muted': '#808080',
          accent: '#0e639c',
          'accent-hover': '#1177bb',
          success: '#4ec9b0',
          warning: '#dcdcaa',
          error: '#f14c4c',
          // Status colors for git
          added: '#4ec9b0',
          modified: '#dcdcaa',
          deleted: '#f14c4c',
        },
      },
      fontFamily: {
        mono: [
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}
