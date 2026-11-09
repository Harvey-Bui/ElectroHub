import { useState, type KeyboardEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Shows a spinner in place of the number while a change is being saved. */
  loading?: boolean;
  /** Accessible name, e.g. "Quantity for Sony WH-1000XM5". */
  label?: string;
  className?: string;
}

const sizes = {
  sm: { box: 'h-8', btn: 'w-8', input: 'w-9 text-sm', icon: 'size-3.5' },
  md: { box: 'h-10', btn: 'w-10', input: 'w-11 text-sm', icon: 'size-4' },
} as const;

/**
 * − [ n ] + control for quantities.
 * Keyboard: ↑/↓ change by 1, PageUp/PageDown by 10, Home/End jump to min/max,
 * typing a number commits on Enter or blur (clamped to min..max).
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  disabled = false,
  loading = false,
  label = 'Quantity',
  className,
}: QuantityStepperProps) {
  // Text being typed; null when not editing, so the field always mirrors `value`.
  const [draft, setDraft] = useState<string | null>(null);

  const s = sizes[size];
  const inactive = disabled || loading;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = (n: number) => {
    const next = clamp(Number.isFinite(n) && n > 0 ? Math.round(n) : value);
    setDraft(null);
    if (next !== value) onChange(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const keys: Record<string, number> = {
      ArrowUp: value + 1,
      ArrowDown: value - 1,
      PageUp: value + 10,
      PageDown: value - 10,
      Home: min,
      End: max,
    };
    if (e.key in keys) {
      e.preventDefault();
      commit(keys[e.key]!);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (draft !== null) commit(Number(draft));
    } else if (e.key === 'Escape') {
      setDraft(null);
    }
  };

  const btn = cn(
    'inline-flex items-center justify-center text-fg-secondary transition-colors duration-fast',
    'hover:bg-accent-soft hover:text-fg disabled:pointer-events-none disabled:opacity-40',
    s.btn,
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex items-stretch overflow-hidden rounded-md border border-border bg-sunken',
        'focus-within:border-accent',
        disabled && 'opacity-50',
        s.box,
        className,
      )}
    >
      <button
        type="button"
        className={btn}
        onClick={() => commit(value - 1)}
        disabled={inactive || value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className={s.icon} aria-hidden />
      </button>
      <div className="relative flex items-center border-x border-border">
        <input
          role="spinbutton"
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft ?? String(value)}
          disabled={inactive}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={() => draft !== null && commit(Number(draft))}
          onKeyDown={onKeyDown}
          className={cn(
            'eh-numeric h-full bg-transparent text-center text-fg focus-visible:outline-none',
            loading && 'invisible',
            s.input,
          )}
        />
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center text-fg-muted">
            <Spinner size="xs" label="Updating quantity" />
          </span>
        )}
      </div>
      <button
        type="button"
        className={btn}
        onClick={() => commit(value + 1)}
        disabled={inactive || value >= max}
        aria-label="Increase quantity"
      >
        <Plus className={s.icon} aria-hidden />
      </button>
    </div>
  );
}
