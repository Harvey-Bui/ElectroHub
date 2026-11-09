import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge needs to know our custom token utilities so that, for
 * example, `text-sm` (font size) and `text-fg-muted` (colour) are not treated
 * as conflicting.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'] }],
      shadow: [{ shadow: ['xs', 'sm', 'md', 'lg', 'xl', 'glow'] }],
      duration: ['duration-fast', 'duration-base', 'duration-slow'],
    },
  },
});

/** Joins class names, dropping falsy values; later Tailwind classes win over earlier ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
