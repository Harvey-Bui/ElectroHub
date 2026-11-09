import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Primary and/or secondary actions (Buttons, ButtonLinks). */
  actions?: ReactNode;
  size?: 'sm' | 'md';
  /** Heading level for `title`, to fit the page outline. */
  headingLevel?: 'h2' | 'h3';
  className?: string;
}

/** Friendly message for "nothing here" moments: empty cart, no results, 404. */
export function EmptyState({
  icon,
  title,
  description,
  actions,
  size = 'md',
  headingLevel: Heading = 'h2',
  className,
}: EmptyStateProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'flex flex-col items-center text-center',
        size === 'md' ? 'gap-4 px-6 py-16' : 'gap-3 px-4 py-10',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl border border-border bg-elevated text-accent-text shadow-sm',
            size === 'md' ? 'size-16 [&>svg]:size-7' : 'size-12 [&>svg]:size-5',
          )}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <div className="flex max-w-md flex-col gap-2">
        <Heading
          id={titleId}
          className={cn('font-semibold text-fg', size === 'md' ? 'text-xl' : 'text-lg')}
        >
          {title}
        </Heading>
        {description && <div className="text-sm text-fg-secondary">{description}</div>}
      </div>
      {actions && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{actions}</div>
      )}
    </section>
  );
}
