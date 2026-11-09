import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Mail, MapPin, Phone, User } from 'lucide-react';
import type { Order } from '@/api/types';
import { countryName, formatDateTime } from '@/lib/orders';
import { OrderSummary } from './OrderSummary';
import { OrderProgress, OrderStatusBadge } from './OrderStatus';

/**
 * Read-only order view shared by the shopper's order page and the admin
 * order page: header, progress, items + totals, shipping and contact.
 * `actions` renders next to the status (cancel button, admin transitions).
 */
export function OrderDetails({
  order,
  actions,
  productHref = (id) => `/products/${id}`,
}: {
  order: Order;
  actions?: ReactNode;
  productHref?: (productId: string) => string;
}) {
  const a = order.shippingAddress;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
      <div className="flex flex-col gap-8">
        <section
          aria-labelledby="order-status"
          className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 md:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2
                id="order-status"
                className="flex items-center gap-3 text-lg font-semibold text-fg"
              >
                Status <OrderStatusBadge status={order.status} />
              </h2>
              <p className="text-sm text-fg-muted">
                Placed {formatDateTime(order.createdAt)}
                {order.updatedAt !== order.createdAt && (
                  <> · Updated {formatDateTime(order.updatedAt)}</>
                )}
              </p>
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
          <OrderProgress status={order.status} />
        </section>

        <OrderSummary
          title={`Items (${order.itemCount})`}
          lines={order.items.map((item) => ({
            key: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            lineTotalCents: item.unitPriceCents * item.quantity,
            note: (
              <Link
                to={productHref(item.productId)}
                className="eh-numeric self-start text-xs text-accent-text hover:underline"
              >
                {item.productId}
              </Link>
            ),
          }))}
          subtotalCents={order.subtotalCents}
          shippingCents={order.shippingCents}
          totalCents={order.totalCents}
        />
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <InfoCard title="Shipping address" icon={<MapPin />}>
          <address className="not-italic">
            {a.line1}
            {a.line2 && (
              <>
                <br />
                {a.line2}
              </>
            )}
            <br />
            {a.city}
            {a.region && `, ${a.region}`} {a.postalCode}
            <br />
            {countryName(a.country)}
          </address>
        </InfoCard>
        {order.contact && (
          <InfoCard title="Contact" icon={<User />}>
            <ul className="flex flex-col gap-1.5">
              <li>{order.contact.name}</li>
              <li className="flex items-center gap-2 break-all">
                <Mail className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
                <span className="sr-only">Email:</span>
                {order.contact.email}
              </li>
              {order.contact.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
                  <span className="sr-only">Phone:</span>
                  {order.contact.phone}
                </li>
              )}
            </ul>
          </InfoCard>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5" aria-label={title}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg [&>svg]:size-4 [&>svg]:text-accent-text">
        {icon}
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-fg-secondary">{children}</div>
    </section>
  );
}
