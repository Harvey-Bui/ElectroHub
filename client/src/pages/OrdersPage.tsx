import { Link, useSearchParams } from 'react-router';
import { Info, Package, TriangleAlert } from 'lucide-react';
import { errorMessage } from '@/api/http';
import { useMyOrders } from '@/api/orderQueries';
import { Price } from '@/components/commerce/Price';
import { OrderStatusBadge } from '@/components/commerce/OrderStatus';
import { Breadcrumbs, Button, ButtonLink, EmptyState, Pagination, Table } from '@/components/ui';
import { plural } from '@/lib/format';
import { formatDate } from '@/lib/orders';

/** The shopper's order history (orders placed from this browser). */
export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const orders = useMyOrders(page);

  return (
    <div className="eh-container py-8 md:py-12">
      <Breadcrumbs items={[{ label: 'Your orders' }]} className="mb-6" />
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-fg md:text-4xl">Your orders</h1>
        <p className="flex items-start gap-2 text-sm text-fg-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Orders are linked to this browser. There's no account to sign in to yet.
        </p>
      </header>

      {orders.isError ? (
        <EmptyState
          icon={<TriangleAlert />}
          title="We couldn't load your orders"
          description={errorMessage(orders.error)}
          actions={<Button onClick={() => void orders.refetch()}>Try again</Button>}
        />
      ) : (
        <>
          <Table
            caption={
              orders.data
                ? `Your orders, ${plural(orders.data.pagination.total, 'order')}`
                : 'Your orders'
            }
            loading={orders.isPending}
            rows={orders.data?.data ?? []}
            getRowKey={(o) => o.id}
            empty={
              <EmptyState
                size="sm"
                headingLevel="h2"
                icon={<Package />}
                title="No orders yet"
                description="When you check out, your orders show up here."
                actions={
                  <ButtonLink to="/products" size="sm">
                    Start shopping
                  </ButtonLink>
                }
              />
            }
            columns={[
              {
                key: 'id',
                header: 'Order',
                cell: (o) => (
                  <Link
                    to={`/orders/${o.id}`}
                    className="eh-numeric font-medium text-accent-text hover:underline"
                  >
                    {o.id}
                  </Link>
                ),
              },
              { key: 'date', header: 'Placed', cell: (o) => formatDate(o.createdAt) },
              {
                key: 'items',
                header: 'Items',
                hideBelow: 'sm',
                cell: (o) => o.items.map((i) => i.name).join(', '),
                className: 'max-w-xs truncate',
              },
              {
                key: 'status',
                header: 'Status',
                cell: (o) => <OrderStatusBadge status={o.status} size="sm" />,
              },
              {
                key: 'total',
                header: 'Total',
                numeric: true,
                cell: (o) => <Price cents={o.totalCents} size="sm" />,
              },
            ]}
          />
          {orders.data && (
            <Pagination
              page={orders.data.pagination.page}
              totalPages={orders.data.pagination.totalPages}
              onPageChange={(p) => setParams(p > 1 ? { page: String(p) } : {})}
            />
          )}
        </>
      )}
    </div>
  );
}
