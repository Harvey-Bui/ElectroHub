import type { ReactNode, Ref, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { controlBase, controlSizes, Field, type ControlSize, type FieldOptions } from './Field';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>, FieldOptions {
  size?: ControlSize;
  /** Options as data. You can also pass <option> children. */
  options?: SelectOption[];
  /** Adds a first, empty option (e.g. "Choose a category"). */
  placeholder?: string;
  leftIcon?: ReactNode;
  ref?: Ref<HTMLSelectElement>;
}

/**
 * Styled native <select>. Native keeps full keyboard, screen-reader and
 * mobile picker support for free.
 */
export function Select({
  label,
  hideLabel,
  hint,
  error,
  required,
  wrapperClassName,
  size = 'md',
  options,
  placeholder,
  leftIcon,
  className,
  id,
  children,
  ref,
  ...rest
}: SelectProps) {
  return (
    <Field
      id={id}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      required={required}
      wrapperClassName={wrapperClassName}
    >
      {(a11y) => (
        <div className="relative">
          {leftIcon && (
            <span
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-muted [&>svg]:size-4"
              aria-hidden
            >
              {leftIcon}
            </span>
          )}
          <select
            ref={ref}
            {...a11y}
            {...rest}
            className={cn(
              controlBase,
              controlSizes[size],
              'cursor-pointer appearance-none pr-9',
              leftIcon && 'pl-9',
              className,
            )}
          >
            {placeholder !== undefined && (
              <option value="" disabled={required}>
                {placeholder}
              </option>
            )}
            {options?.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
            aria-hidden
          />
        </div>
      )}
    </Field>
  );
}
