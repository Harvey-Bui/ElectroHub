import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  /** Secondary text under the label, linked with aria-describedby. */
  description?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Native checkbox (keyboard, forms and screen readers work as usual) with a
 * token-styled box. The whole label is the click target.
 */
export function Checkbox({
  label,
  description,
  className,
  id: idProp,
  ref,
  ...rest
}: CheckboxProps) {
  const autoId = useId();
  const id = idProp ?? `checkbox-${autoId}`;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <span className="relative mt-0.5 inline-flex size-5 shrink-0">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          aria-describedby={descriptionId}
          className={cn(
            'peer size-5 cursor-pointer appearance-none rounded-sm border border-border-strong bg-sunken',
            'transition-colors duration-fast checked:border-accent checked:bg-accent',
            'hover:border-accent disabled:cursor-not-allowed disabled:opacity-50',
          )}
          {...rest}
        />
        <Check
          className="pointer-events-none absolute inset-0 m-auto size-3.5 text-accent-contrast opacity-0 transition-opacity duration-fast peer-checked:opacity-100"
          strokeWidth={3}
          aria-hidden
        />
      </span>
      <span className="flex flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-fg">
          {label}
        </label>
        {description && (
          <span id={descriptionId} className="text-xs text-fg-muted">
            {description}
          </span>
        )}
      </span>
    </div>
  );
}
