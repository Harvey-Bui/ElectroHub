import { Link, useSearchParams } from 'react-router';
import { Inbox, TriangleAlert } from 'lucide-react';
import { useAdminOrders, useDashboard } from '@/api/adminQueries';
import { errorMessage } from '@/api/http';
import { ORDER_STATUSES, type OrderStatus } from '@/api/types';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { OrderStatusBadge } from '@/components/commerce/OrderStatus';
import { Price } from '@/components/commerce/Price';
import { Button, EmptyState, Pagination, Table } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDateTime, ORDER_STATUS_META } from '@/lib/orders';

const PAGE_SIZE = 15;

export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('status');
  const status = ORDER_STATUSES.includes(raw as OrderStatus) ? (raw as OrderStatus) : undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const orders = useAdminOrders({ status, page, limit: PAGE_SIZE });
  const counts = useDashboard().data?.orders;

  const filters: Array<{ value?: OrderStatus; label: string; count?: number }> = [
    { label: 'All', count: counts?.total },
    ...ORDER_STATUSES.map((s) => ({
      value: s,
      label: ORDER_STATUS_META[s].label,
      count: counts?.byStatus[s],
    })),
  ];

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="Every order, newest first. Open one to update its status."
      />

      <nav
        aria-label="Filter orders by status"
        className="-mx-4 mb-6 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex gap-2">
          {filters.map((f) => {
            const active = f.value === status;
            return (
              <li key={f.label}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setParams(f.value ? { status: f.value } : {})}
                  className={cn(
                    'inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors duration-fast',
                    active
                      ? 'border-accent bg-accent-soft text-fg'
                      : 'border-border text-fg-secondary hover:border-border-strong hover:text-fg',
                  )}
                >
                  {f.label}
                  {f.count !== undefined && (
                    <span className="eh-numeric text-xs text-fg-muted">{f.count}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {orders.isError ? (
        <EmptyState
          icon={<TriangleAlert />}
          title="Orders unavailable"
          description={errorMessage(orders.error)}
          actions={<Button onClick={() => void orders.refetch()}>Try again</Button>}
        />
      ) : (
        <>
          <Table
            caption={status ? `${ORDER_STATUS_META[status].label} orders` : 'All orders'}
            loading={orders.isPending}
            loadingRows={6}
            rows={orders.data?.data ?? []}
            getRowKey={(o) => o.id}
            className={cn(orders.isPlaceholderData && 'opacity-60')}
            empty={
              <EmptyState
                size="sm"
                headingLevel="h2"
                icon={<Inbox />}
                title={
                  status
                    ? `No ${ORDER_STATUS_META[status].label.toLowerCase()} orders`
                    : 'No orders yet'
                }
                description="Orders appear here as soon as shoppers check out."
              />
            }
            columns={[
              {
                key: 'id',
                header: 'Order',
                cell: (o) => (
                  <Link
                    to={`/admin/orders/${o.id}`}
                    className="eh-numeric font-medium text-accent-text hover:underline"
                  >
                    {o.id}
                  </Link>
                ),
              },
              {
                key: 'placed',
                header: 'Placed',
                hideBelow: 'md',
                cell: (o) => formatDateTime(o.createdAt),
              },
              {
                key: 'customer',
                header: 'Customer',
                hideBelow: 'sm',
                cell: (o) =>
                  o.contact ? (
                    <span className="flex flex-col">
                      <span className="text-fg">{o.contact.name}</span>
                      <span className="text-xs text-fg-muted">{o.contact.email}</span>
                    </span>
                  ) : (
                    <span className="eh-numeric text-xs">{o.customerId}</span>
                  ),
              },
              {
                key: 'items',
                header: 'Items',
                numeric: true,
                hideBelow: 'lg',
                cell: (o) => o.itemCount,
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
              onPageChange={(p) => {
                const next = new URLSearchParams(params);
                if (p > 1) next.set('page', String(p));
                else next.delete('page');
                setParams(next);
              }}
            />
          )}
        </>
      )}
    </>
  );
}
