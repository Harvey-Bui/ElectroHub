import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS v4 is configured CSS-first in src/styles/index.css, which loads
 * this file through the `@config` directive. Shared design tokens live here so
 * they are typed and easy for the whole team to find.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdaff',
          300: '#8ec3ff',
          400: '#59a2ff',
          500: '#337dfc',
          600: '#1d5ef1',
          700: '#1549de',
          800: '#183db4',
          900: '#1a388e',
          950: '#152456',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
} satisfies Config;
