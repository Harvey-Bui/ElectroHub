import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type CardVariant = 'default' | 'elevated' | 'outline' | 'ghost';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const variants: Record<CardVariant, string> = {
  default: 'border border-border bg-surface',
  elevated: 'border border-border bg-elevated shadow-md',
  outline: 'border border-border-strong bg-transparent',
  ghost: 'bg-transparent',
};

const paddings: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 md:p-6',
  lg: 'p-6 md:p-8',
};

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Rendered element: `article` for self-contained items, `section` with a heading, `li` in lists. */
  as?: ElementType;
  variant?: CardVariant;
  padding?: CardPadding;
  /**
   * Hover lift + focus ring for cards that contain a primary link. The link
   * inside should cover the card (see ProductCard) so the whole card is clickable.
   */
  interactive?: boolean;
}

/** Container surface. Compose with CardHeader / CardTitle / CardDescription / CardFooter. */
export function Card({
  as: As = 'div',
  variant = 'default',
  padding = 'md',
  interactive = false,
  className,
  ...rest
}: CardProps) {
  return (
    <As
      className={cn(
        'relative rounded-lg text-fg',
        variants[variant],
        paddings[padding],
        interactive &&
          'transition-[border-color,box-shadow,transform] duration-base ease-standard hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg focus-within:border-accent motion-reduce:hover:translate-y-0',
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex flex-col gap-1', className)} {...rest} />;
}

export function CardTitle({
  as: As = 'h3',
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement> & { as?: 'h2' | 'h3' | 'h4' }) {
  return <As className={cn('text-lg font-semibold text-fg', className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-fg-secondary', className)} {...rest} />;
}

export function CardFooter({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div
      className={cn('mt-6 flex items-center gap-3 border-t border-border pt-4', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
