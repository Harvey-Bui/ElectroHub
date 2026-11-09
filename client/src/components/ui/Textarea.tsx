import { useState, type ChangeEvent, type Ref, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { controlBase, Field, type FieldOptions } from './Field';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldOptions {
  /** Shows "n / maxLength" next to the label when `maxLength` is set. Default true. */
  showCount?: boolean;
  resize?: 'none' | 'vertical';
  ref?: Ref<HTMLTextAreaElement>;
}

/** Multi-line text input with label, hint, error and an optional character counter. */
export function Textarea({
  label,
  hideLabel,
  hint,
  error,
  required,
  wrapperClassName,
  showCount = true,
  resize = 'vertical',
  maxLength,
  rows = 4,
  className,
  id,
  value,
  defaultValue,
  onChange,
  ref,
  ...rest
}: TextareaProps) {
  const [uncontrolledLength, setUncontrolledLength] = useState(String(defaultValue ?? '').length);
  const length = value !== undefined ? String(value).length : uncontrolledLength;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setUncontrolledLength(event.target.value.length);
    onChange?.(event);
  };

  const counter =
    maxLength && showCount ? (
      <span
        className={cn(
          'eh-numeric text-xs',
          length >= maxLength
            ? 'text-danger'
            : length > maxLength * 0.9
              ? 'text-warning'
              : 'text-fg-muted',
        )}
        aria-live="polite"
      >
        {length} / {maxLength}
      </span>
    ) : undefined;

  return (
    <Field
      id={id}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      required={required}
      labelAside={counter}
      wrapperClassName={wrapperClassName}
    >
      {(a11y) => (
        <textarea
          ref={ref}
          {...a11y}
          {...rest}
          rows={rows}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          className={cn(
            controlBase,
            'min-h-20 px-3 py-2.5 text-sm leading-relaxed',
            resize === 'none' ? 'resize-none' : 'resize-y',
            className,
          )}
        />
      )}
    </Field>
  );
}
