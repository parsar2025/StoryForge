import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(220, 15%, 8%)',
        foreground: 'hsl(210, 40%, 98%)',
        primary: {
          DEFAULT: 'hsl(142, 76%, 56%)',
          foreground: 'hsl(220, 15%, 8%)',
        },
        secondary: {
          DEFAULT: 'hsl(210, 40%, 20%)',
          foreground: 'hsl(210, 40%, 98%)',
        },
        accent: {
          DEFAULT: 'hsl(47, 100%, 66%)',
          foreground: 'hsl(220, 15%, 8%)',
        },
        destructive: {
          DEFAULT: 'hsl(0, 85%, 60%)',
          foreground: 'hsl(210, 40%, 98%)',
        },
        muted: {
          DEFAULT: 'hsl(210, 40%, 15%)',
          foreground: 'hsl(210, 40%, 70%)',
        },
        card: {
          DEFAULT: 'hsl(220, 15%, 10%)',
          foreground: 'hsl(210, 40%, 98%)',
        },
        popover: {
          DEFAULT: 'hsl(220, 15%, 10%)',
          foreground: 'hsl(210, 40%, 98%)',
        },
        border: 'hsl(210, 40%, 25%)',
        input: 'hsl(210, 40%, 25%)',
        ring: 'hsl(142, 76%, 56%)',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'monospace'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 2px)',
        sm: 'calc(0.5rem - 4px)',
      },
    },
  },
  plugins: [],
};

export default config;
