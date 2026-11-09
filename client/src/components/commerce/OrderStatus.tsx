import { Ban, Check, CircleDot } from 'lucide-react';
import type { OrderStatus } from '@/api/types';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { ORDER_FLOW, ORDER_STATUS_META } from '@/lib/orders';

/** Status as a text badge. The label carries the meaning; colour only reinforces it. */
export function OrderStatusBadge({
  status,
  size = 'md',
}: {
  status: OrderStatus;
  size?: 'sm' | 'md';
}) {
  const meta = ORDER_STATUS_META[status];
  return (
    <Badge variant={meta.badge} size={size} dot>
      {meta.label}
    </Badge>
  );
}

/**
 * Progress through pending → paid → shipped → delivered as an ordered list
 * (steps are announced as "completed" / "current"). Cancelled orders show a
 * single cancelled state instead.
 */
export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4">
        <Ban className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-fg">Order cancelled</p>
          <p className="text-sm text-fg-secondary">{ORDER_STATUS_META.cancelled.description}</p>
        </div>
      </div>
    );
  }

  const current = ORDER_FLOW.indexOf(status);
  return (
    <div className="flex flex-col gap-4">
      <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
        {ORDER_FLOW.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={step}
              className="flex flex-col gap-2"
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={cn(
                  'h-1.5 rounded-full transition-colors duration-slow',
                  i <= current ? 'bg-accent' : 'bg-sunken',
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium sm:text-sm',
                  i <= current ? 'text-fg' : 'text-fg-muted',
                )}
              >
                {done ? (
                  <Check className="size-3.5 shrink-0 text-accent-text" aria-hidden />
                ) : active ? (
                  <CircleDot className="size-3.5 shrink-0 text-accent-text" aria-hidden />
                ) : null}
                {ORDER_STATUS_META[step].label}
                <span className="sr-only">
                  {done ? ' (completed)' : active ? ' (current)' : ''}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-fg-secondary">{ORDER_STATUS_META[status].description}</p>
    </div>
  );
}
