import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Boxes,
  CircleDollarSign,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { useDashboard } from '@/api/adminQueries';
import { errorMessage } from '@/api/http';
import { ORDER_STATUSES } from '@/api/types';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { BarList } from '@/components/admin/BarList';
import { StatCard } from '@/components/admin/StatCard';
import { OrderStatusBadge } from '@/components/commerce/OrderStatus';
import { Price } from '@/components/commerce/Price';
import { StockBadge } from '@/components/commerce/StockStatus';
import { Button, ButtonLink, EmptyState, Skeleton, SkeletonGroup, Table } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import { formatDateTime, ORDER_STATUS_META } from '@/lib/orders';

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const id = `panel-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="text-base font-semibold text-fg">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminDashboardPage() {
  const dashboard = useDashboard();

  const header = (
    <AdminPageHeader
      title="Dashboard"
      description={
        dashboard.data ? (
          <span aria-live="polite">
            Live from Redis · updated {formatDateTime(dashboard.data.generatedAt)}
          </span>
        ) : (
          'Store overview'
        )
      }
      actions={
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw />}
          loading={dashboard.isFetching && !dashboard.isPending}
          onClick={() => void dashboard.refetch()}
        >
          Refresh
        </Button>
      }
    />
  );

  if (dashboard.isPending) {
    return (
      <>
        {header}
        <SkeletonGroup label="Loading dashboard" className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </SkeletonGroup>
      </>
    );
  }

  if (dashboard.isError) {
    return (
      <>
        {header}
        <EmptyState
          icon={<TriangleAlert />}
          title="Dashboard unavailable"
          description={errorMessage(dashboard.error)}
          actions={<Button onClick={() => void dashboard.refetch()}>Try again</Button>}
        />
      </>
    );
  }

  const d = dashboard.data;
  const stockAlerts = d.inventory.lowStock;
  const openOrders = d.orders.byStatus.pending + d.orders.byStatus.paid;

  return (
    <>
      {header}

      <section aria-label="Key figures" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hero
          label="Revenue"
          icon={<CircleDollarSign />}
          value={formatPrice(d.orders.revenueCents)}
          detail="All orders except cancelled"
          className="sm:col-span-2 xl:col-span-1"
        />
        <StatCard
          label="Orders"
          icon={<ShoppingCart />}
          value={d.orders.total}
          detail={`${openOrders} awaiting fulfilment · avg ${formatPrice(d.orders.averageOrderCents)}`}
        />
        <StatCard
          label="Customers"
          icon={<Users />}
          value={d.customers}
          detail={`${d.catalog.products} products in the catalogue`}
        />
        <StatCard
          label="Stock alerts"
          icon={stockAlerts > 0 ? <TriangleAlert /> : <PackageCheck />}
          tone={stockAlerts > 0 ? 'warning' : 'default'}
          value={stockAlerts}
          detail={`${d.inventory.outOfStock} out of stock · ${d.inventory.totalUnits} units on hand`}
        />
      </section>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Orders by status"
          action={
            <Link to="/admin/orders" className="text-sm text-accent-text hover:underline">
              All orders
            </Link>
          }
        >
          <BarList
            label="Orders by status"
            unit="orders"
            items={ORDER_STATUSES.map((s) => ({
              key: s,
              label: ORDER_STATUS_META[s].label,
              value: d.orders.byStatus[s],
              href: `/admin/orders?status=${s}`,
            }))}
            empty={
              <p className="py-6 text-center text-sm text-fg-muted">
                No orders yet. They appear here as soon as shoppers check out.
              </p>
            }
          />
        </Panel>
        <Panel
          title="Top sellers"
          action={<span className="text-xs text-fg-muted">Units sold</span>}
        >
          <BarList
            label="Top sellers by units sold"
            unit="units"
            items={d.topSellers.map((t) => ({
              key: t.productId,
              label: t.name,
              value: t.unitsSold,
              href: `/admin/products/${t.productId}/edit`,
            }))}
            empty={<p className="py-6 text-center text-sm text-fg-muted">No sales yet.</p>}
          />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Recent orders"
          action={
            <ButtonLink to="/admin/orders" variant="link" size="sm">
              View all
            </ButtonLink>
          }
        >
          <Table
            caption="Five most recent orders"
            density="compact"
            rows={d.recentOrders}
            getRowKey={(o) => o.id}
            className="border-0"
            empty={<p className="px-4 py-8 text-center text-sm text-fg-muted">No orders yet</p>}
            columns={[
              {
                key: 'id',
                header: 'Order',
                cell: (o) => (
                  <Link
                    to={`/admin/orders/${o.id}`}
                    className="eh-numeric text-accent-text hover:underline"
                  >
                    {o.id}
                  </Link>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                cell: (o) => <OrderStatusBadge status={o.status} size="sm" />,
              },
              {
                key: 'date',
                header: 'Placed',
                hideBelow: 'sm',
                cell: (o) => formatDateTime(o.createdAt),
              },
              {
                key: 'total',
                header: 'Total',
                numeric: true,
                cell: (o) => <Price cents={o.totalCents} size="sm" />,
              },
            ]}
          />
        </Panel>
        <Panel
          title="Low stock"
          action={
            <ButtonLink to="/admin/inventory" variant="link" size="sm">
              Restock
            </ButtonLink>
          }
        >
          <Table
            caption={`Products at or below ${d.inventory.lowStockThreshold} units`}
            density="compact"
            rows={d.lowStock}
            getRowKey={(p) => p.productId}
            className="border-0"
            empty={
              <p className="px-4 py-8 text-center text-sm text-fg-muted">
                Everything is well stocked.
              </p>
            }
            columns={[
              {
                key: 'name',
                header: 'Product',
                cell: (p) => (
                  <Link
                    to={`/admin/products/${p.productId}/edit`}
                    className="hover:text-accent-text"
                  >
                    {p.name}
                  </Link>
                ),
              },
              {
                key: 'stock',
                header: 'Stock',
                numeric: true,
                cell: (p) => (
                  <span className="inline-flex items-center gap-2">
                    <StockBadge stock={p.stock} />
                    <span className="eh-numeric">{p.stock}</span>
                  </span>
                ),
              },
            ]}
          />
        </Panel>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-fg-muted">
        <Boxes className="size-3.5" aria-hidden />
        {d.inventory.trackedProducts} products tracked · low-stock threshold{' '}
        {d.inventory.lowStockThreshold} units
      </p>
    </>
  );
}
