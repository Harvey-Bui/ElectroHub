import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';

const sizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
} as const;

export interface PriceProps {
  cents: number;
  size?: keyof typeof sizes;
  /** De-emphasised (e.g. per-unit price under a line total). */
  muted?: boolean;
  className?: string;
}

/** Price in JetBrains Mono with tabular figures, so columns of prices line up. */
export function Price({ cents, size = 'md', muted = false, className }: PriceProps) {
  return (
    <span
      className={cn(
        'eh-numeric font-semibold tracking-tight',
        sizes[size],
        muted ? 'font-normal text-fg-muted' : 'text-fg',
        className,
      )}
    >
      {formatPrice(cents)}
    </span>
  );
}
