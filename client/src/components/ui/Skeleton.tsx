import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  shape?: 'rect' | 'text' | 'circle';
  /** For `text`: number of lines (the last one is shorter). */
  lines?: number;
}

/**
 * Placeholder shimmer that keeps the layout stable while data loads.
 * Purely visual (`aria-hidden`); wrap a group in <SkeletonGroup> so screen
 * readers hear one "Loading…" instead of nothing.
 */
export function Skeleton({ shape = 'rect', lines = 1, className, ...rest }: SkeletonProps) {
  if (shape === 'text') {
    return (
      <span className={cn('flex w-full flex-col gap-2', className)} aria-hidden {...rest}>
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className={cn(
              'eh-skeleton h-3.5 rounded-sm',
              i === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full',
            )}
          />
        ))}
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'eh-skeleton block',
        shape === 'circle' ? 'rounded-full' : 'rounded-md',
        className,
      )}
      {...rest}
    />
  );
}

/** Announces a loading region once, politely, while its skeletons are shown. */
export function SkeletonGroup({
  label = 'Loading',
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}
