import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant =
  'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'outline' | 'solid';

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-elevated text-fg-secondary border border-border',
  accent: 'bg-accent-soft text-accent-text',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  outline: 'border border-border-strong text-fg-secondary',
  solid: 'bg-accent text-accent-contrast',
};

const sizes = {
  sm: 'h-5 gap-1 px-1.5 text-xs',
  md: 'h-6 gap-1.5 px-2 text-xs',
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: keyof typeof sizes;
  /** Small status dot before the text. */
  dot?: boolean;
  icon?: ReactNode;
}

/**
 * Short status or metadata label. The meaning must be in the text, not only
 * the colour (e.g. "Out of stock", not just a red badge).
 */
export function Badge({
  variant = 'neutral',
  size = 'md',
  dot,
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-medium',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {icon && (
        <span className="inline-flex [&>svg]:size-3" aria-hidden>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
