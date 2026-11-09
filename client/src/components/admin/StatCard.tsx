import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Context under the number ("3 low, 1 out of stock"). */
  detail?: ReactNode;
  icon?: ReactNode;
  /** Larger value for the headline metric. */
  hero?: boolean;
  /** Draws attention with the warning tone (e.g. stock alerts). The detail text says why. */
  tone?: 'default' | 'warning';
  className?: string;
}

/**
 * A single headline number. Used instead of a chart when the job is "one
 * value": label above, value in JetBrains Mono, context below in text tokens.
 */
export function StatCard({
  label,
  value,
  detail,
  icon,
  hero = false,
  tone = 'default',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-surface p-5',
        tone === 'warning' ? 'border-warning/40' : 'border-border',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-fg-secondary">{label}</p>
        {icon && (
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-md [&>svg]:size-4',
              tone === 'warning'
                ? 'bg-warning-soft text-warning'
                : 'bg-accent-soft text-accent-text',
            )}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          'eh-numeric font-semibold tracking-tight text-fg',
          hero ? 'text-4xl' : 'text-2xl',
        )}
      >
        {value}
      </p>
      {detail && <p className="text-xs text-fg-muted">{detail}</p>}
    </div>
  );
}
