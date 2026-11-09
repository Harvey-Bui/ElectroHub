import { cn } from '@/lib/cn';

const sizes = { xs: 'size-3', sm: 'size-4', md: 'size-5', lg: 'size-8' } as const;

export interface SpinnerProps {
  size?: keyof typeof sizes;
  /** Announced to screen readers. Pass `null` when a parent already announces loading. */
  label?: string | null;
  className?: string;
}

/** Indeterminate progress indicator. Inherits the current text colour. */
export function Spinner({ size = 'sm', label = 'Loading', className }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex shrink-0', className)}
    >
      <svg
        className={cn(
          sizes[size],
          'animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]',
        )}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
