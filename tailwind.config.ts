/** @type {import('tailwindcss').Config} */
const scale = (name: string) => {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const out: Record<string, string> = {};
  steps.forEach((s) => {
    out[s] = `oklch(var(--${name}-${s}) / <alpha-value>)`;
  });
  return out;
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: scale('background'),
        primary: scale('primary'),
        accent: scale('accent'),
        secondary: scale('secondary'),
        foreground: scale('foreground'),
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        body: ['var(--font-body)'],
        heading: ['var(--font-heading)'],
        display: ['var(--font-heading)'],
        serif: ['var(--font-heading)'],
        label: ['var(--font-label)'],
      },
    },
  },
  plugins: [],
};