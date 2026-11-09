import { useId, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ControlSize = 'sm' | 'md' | 'lg';

/** Props every form control (Input, Select, Textarea) accepts for its label and messages. */
export interface FieldOptions {
  /** Visible label. Strongly recommended; use `hideLabel` to keep it for screen readers only. */
  label?: ReactNode;
  hideLabel?: boolean;
  /** Help text under the control (replaced by `error` when invalid). */
  hint?: ReactNode;
  /** Error message. Marks the control `aria-invalid` and links the message. */
  error?: ReactNode;
  /** Shows a "Required" marker. Pass `required` to the control too. */
  required?: boolean;
  /** Class names for the wrapping element. */
  wrapperClassName?: string;
}

export interface ControlA11yProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  required?: boolean;
}

interface FieldProps extends FieldOptions {
  id?: string;
  /** Extra text shown at the end of the label row (e.g. a character counter). */
  labelAside?: ReactNode;
  children: (control: ControlA11yProps) => ReactNode;
}

/**
 * Lays out label, control, hint and error with the correct ARIA wiring:
 * <label for>, aria-describedby → hint/error, aria-invalid when there's an error.
 */
export function Field({
  id: idProp,
  label,
  hideLabel,
  hint,
  error,
  required,
  labelAside,
  wrapperClassName,
  children,
}: FieldProps) {
  const autoId = useId();
  const id = idProp ?? `field-${autoId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <div className={cn('flex items-baseline justify-between gap-2', hideLabel && 'sr-only')}>
          <label htmlFor={id} className="text-sm font-medium text-fg">
            {label}
            {required && (
              <span className="ml-0.5 text-danger" aria-hidden>
                *
              </span>
            )}
          </label>
          {labelAside}
        </div>
      )}
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        required,
      })}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-xs text-danger">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Shared look for text-like controls (Input, Select, Textarea). */
export const controlBase =
  'w-full rounded-md border border-border bg-sunken text-fg placeholder:text-fg-muted ' +
  'transition-[border-color,box-shadow,background-color] duration-fast ease-standard ' +
  'hover:border-border-strong focus-visible:border-accent focus-visible:outline-offset-0 ' +
  'aria-invalid:border-danger aria-invalid:focus-visible:outline-danger ' +
  'disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-surface';

export const controlSizes: Record<ControlSize, string> = {
  sm: 'h-8 px-2.5 text-sm',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-4 text-base',
};
