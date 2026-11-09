import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS v4 is configured CSS-first:
 *  - src/styles/tokens.css: every design value as a CSS variable (dark + light)
 *  - src/styles/theme.css: maps those variables onto Tailwind's theme
 *    (colours, type scale, 4px spacing, radii, shadows, breakpoints)
 *
 * This file is loaded through `@config` in index.css and only declares where
 * class names are used. Do not add colours or sizes here; add tokens instead.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config;
