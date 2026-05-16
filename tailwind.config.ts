/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B1020',
        secondary: '#111827',
        primary: '#06B6D4',
        purple: '#8B5CF6',
        indigo: '#4F46E5',
        text: '#E5E7EB',
      },
      fontFamily: {
        orbitron: ['var(--font-orbitron)', 'sans-serif'],
        outfit: ['var(--font-outfit)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}