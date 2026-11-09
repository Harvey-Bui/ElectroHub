import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';
import { controlBase, controlSizes, Field, type ControlSize, type FieldOptions } from './Field';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, FieldOptions {
  size?: ControlSize;
  /** Decorative icon inside the left edge (e.g. a search glass). */
  leftIcon?: ReactNode;
  /** Interactive element or text inside the right edge (e.g. a clear button, unit). */
  rightElement?: ReactNode;
  /** Shows a spinner at the right edge (async validation, search in progress). */
  loading?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/** Text input with label, hint, error, icons and loading state. */
export function Input({
  label,
  hideLabel,
  hint,
  error,
  required,
  wrapperClassName,
  size = 'md',
  leftIcon,
  rightElement,
  loading,
  className,
  id,
  ref,
  ...rest
}: InputProps) {
  const right = loading ? <Spinner size="sm" label="Loading" /> : rightElement;
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
          <input
            ref={ref}
            {...a11y}
            {...rest}
            className={cn(
              controlBase,
              controlSizes[size],
              leftIcon && 'pl-9',
              right && 'pr-10',
              className,
            )}
          />
          {right && (
            <span className="absolute inset-y-0 right-2 flex items-center text-fg-muted">
              {right}
            </span>
          )}
        </div>
      )}
    </Field>
  );
}
