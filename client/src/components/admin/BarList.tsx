import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

export interface BarListItem {
  key: string;
  label: ReactNode;
  value: number;
  /** Formatted value shown at the end of the row (defaults to the number). */
  display?: string;
  href?: string;
}

export interface BarListProps {
  items: BarListItem[];
  /** Accessible name, e.g. "Orders by status". */
  label: string;
  /** Unit for the hover/screen-reader text, e.g. "orders". */
  unit: string;
  empty?: ReactNode;
}

/**
 * Horizontal bar list for one measure across a few categories: a single
 * accent hue (one series needs no legend), the label and value as text in
 * text tokens, bars anchored at zero with rounded ends. Each row is
 * hoverable with a tooltip that gives the exact value and share, and the list
 * reads naturally to screen readers ("Paid: 4 orders, 40%").
 */
export function BarList({ items, label, unit, empty }: BarListProps) {
  const max = Math.max(0, ...items.map((i) => i.value));
  const total = items.reduce((sum, i) => sum + i.value, 0);
  if (items.length === 0 || total === 0) {
    return <>{empty ?? <p className="py-6 text-center text-sm text-fg-muted">No data yet</p>}</>;
  }

  return (
    <ul aria-label={label} className="flex flex-col gap-1">
      {items.map((item) => {
        const width = max > 0 ? (item.value / max) * 100 : 0;
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
        const tooltip = `${typeof item.label === 'string' ? item.label : item.key}: ${item.display ?? item.value} ${unit} (${share}%)`;
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-fg-secondary group-hover:text-fg">{item.label}</span>
              <span className="eh-numeric shrink-0 text-fg">
                {item.display ?? item.value}
                <span className="sr-only">
                  {' '}
                  {unit}, {share}%
                </span>
              </span>
            </span>
            <span className="block h-2 rounded-full bg-sunken" aria-hidden>
              <span
                className="block h-full rounded-full bg-accent transition-[width,opacity] duration-slow ease-standard group-hover:opacity-80"
                style={{ width: `${width}%`, minWidth: item.value > 0 ? '0.5rem' : 0 }}
              />
            </span>
          </>
        );
        const rowClass = cn(
          'group flex flex-col gap-1.5 rounded-md px-2 py-2 transition-colors duration-fast hover:bg-accent-soft',
        );
        return (
          <li key={item.key} title={tooltip}>
            {item.href ? (
              <Link to={item.href} className={rowClass}>
                {body}
              </Link>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
