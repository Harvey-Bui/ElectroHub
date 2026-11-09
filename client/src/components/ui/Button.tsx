import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium ' +
  'transition-[background-color,border-color,color,box-shadow,opacity] duration-fast ease-standard ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-contrast shadow-sm hover:bg-accent-hover hover:shadow-glow active:bg-accent-active',
  secondary:
    'border border-border bg-elevated text-fg shadow-xs hover:border-border-strong hover:bg-surface',
  outline: 'border border-border-strong text-fg hover:border-accent hover:bg-accent-soft',
  ghost: 'text-fg-secondary hover:bg-accent-soft hover:text-fg',
  danger: 'bg-danger-fill text-white shadow-sm hover:opacity-90',
  link: 'h-auto px-0 text-accent-text underline-offset-4 hover:underline',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-md px-3 text-sm',
  md: 'h-10 rounded-md px-4 text-sm',
  lg: 'h-12 rounded-lg px-6 text-base',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'size-8 rounded-md',
  md: 'size-10 rounded-md',
  lg: 'size-12 rounded-lg',
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square button holding only an icon. Requires an `aria-label`. */
  iconOnly?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/** Button class names, shared by <Button> and <ButtonLink>. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    base,
    variants[variant],
    iconOnly && variant !== 'link' ? iconSizes[size] : sizes[size],
    variant === 'link' && 'h-auto px-0',
    fullWidth && 'w-full',
    className,
  );
}

interface ContentProps {
  loading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

function ButtonContent({ loading, loadingText, leftIcon, rightIcon, children }: ContentProps) {
  return (
    <>
      {/* Content stays in the layout (invisible) while loading so the width never jumps. */}
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>
        {leftIcon && (
          <span className="inline-flex shrink-0 [&>svg]:size-4" aria-hidden>
            {leftIcon}
          </span>
        )}
        {children}
        {rightIcon && (
          <span className="inline-flex shrink-0 [&>svg]:size-4" aria-hidden>
            {rightIcon}
          </span>
        )}
      </span>
      {loading && (
        <span className="absolute inset-0 inline-flex items-center justify-center">
          <Spinner size="sm" label={loadingText ?? 'Loading'} />
        </span>
      )}
    </>
  );
}

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonStyleOptions,
    Omit<ContentProps, 'children'> {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Primary action control.
 * - `loading` keeps the width, shows a spinner, sets `aria-busy` and blocks clicks.
 * - `iconOnly` buttons must have an `aria-label`.
 * - Defaults to `type="button"` so it never submits a form by accident.
 */
export function Button({
  variant,
  size,
  iconOnly,
  fullWidth,
  className,
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  disabled,
  type = 'button',
  children,
  ref,
  ...rest
}: ButtonProps) {
  if (import.meta.env.DEV && iconOnly && !rest['aria-label'] && !rest['aria-labelledby']) {
    console.warn('<Button iconOnly> needs an aria-label so screen readers can announce it.');
  }
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, iconOnly, fullWidth, className })}
      {...rest}
    >
      <ButtonContent
        loading={loading}
        loadingText={loadingText}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
      >
        {children}
      </ButtonContent>
    </button>
  );
}

export interface ButtonLinkProps extends LinkProps, ButtonStyleOptions {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/** A router link that looks like a button (navigation, not actions). */
export function ButtonLink({
  variant,
  size,
  iconOnly,
  fullWidth,
  className,
  leftIcon,
  rightIcon,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, iconOnly, fullWidth, className })} {...rest}>
      <ButtonContent leftIcon={leftIcon} rightIcon={rightIcon}>
        {children as ReactNode}
      </ButtonContent>
    </Link>
  );
}
