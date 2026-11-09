import type { ReactNode } from 'react';
import { formatPrice } from '@/lib/format';
import { Price } from './Price';

export interface SummaryLine {
  key: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  /** Optional thumbnail (e.g. a ProductImage). */
  media?: ReactNode;
  note?: ReactNode;
}

export interface OrderSummaryProps {
  lines: SummaryLine[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  /** Heading level to fit the page outline. */
  headingLevel?: 'h2' | 'h3';
  title?: string;
  footer?: ReactNode;
}

/** Line items + subtotal / shipping / total. Used by checkout and order pages. */
export function OrderSummary({
  lines,
  subtotalCents,
  shippingCents,
  totalCents,
  headingLevel: Heading = 'h2',
  title = 'Order summary',
  footer,
}: OrderSummaryProps) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 md:p-6"
    >
      <Heading className="text-lg font-semibold text-fg">{title}</Heading>
      <ul className="flex flex-col divide-y divide-border">
        {lines.map((line) => (
          <li key={line.key} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            {line.media}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-sm font-medium text-fg">{line.name}</p>
              <p className="eh-numeric text-xs text-fg-muted">
                {line.quantity} × {formatPrice(line.unitPriceCents)}
              </p>
              {line.note}
            </div>
            <Price cents={line.lineTotalCents} size="sm" className="shrink-0" />
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between text-fg-secondary">
          <dt>Subtotal</dt>
          <dd className="eh-numeric">{formatPrice(subtotalCents)}</dd>
        </div>
        <div className="flex justify-between text-fg-secondary">
          <dt>Shipping</dt>
          <dd className="eh-numeric">
            {shippingCents === 0 ? 'Free' : formatPrice(shippingCents)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-border pt-3 font-semibold text-fg">
          <dt className="text-base">Total</dt>
          <dd>
            <Price cents={totalCents} size="lg" />
          </dd>
        </div>
      </dl>
      {footer}
    </section>
  );
}
