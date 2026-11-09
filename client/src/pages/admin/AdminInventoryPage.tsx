import { useState } from 'react';
import { Link } from 'react-router';
import { PackageCheck, PackageX, TriangleAlert, Warehouse } from 'lucide-react';
import { useDashboard, useLowStock, useUpdateProduct } from '@/api/adminQueries';
import { errorMessage } from '@/api/http';
import type { LowStockEntry } from '@/api/types';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { Price } from '@/components/commerce/Price';
import { StockBadge } from '@/components/commerce/StockStatus';
import { Button, EmptyState, QuantityStepper, Table, useToast } from '@/components/ui';
import { useCategories } from '@/api/queries';
import { titleCase } from '@/lib/format';

/** Low-stock ranking (inventory:low-stock, lowest first) with inline restocking. */
export function AdminInventoryPage() {
  const lowStock = useLowStock(100);
  const categories = useCategories();
  const categoryName = (slug: string) =>
    categories.data?.find((c) => c.slug === slug)?.name ?? titleCase(slug);
  const summary = useDashboard().data?.inventory;

  return (
    <>
      <AdminPageHeader
        title="Inventory"
        description={
          summary
            ? `Products at or below ${summary.lowStockThreshold} units, lowest first. Saving sets the new stock level atomically.`
            : 'Products running low, lowest first.'
        }
      />

      {summary && (
        <section aria-label="Inventory summary" className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Units on hand"
            icon={<Warehouse />}
            value={summary.totalUnits}
            detail={`${summary.trackedProducts} products tracked`}
          />
          <StatCard
            label="Low stock"
            icon={<TriangleAlert />}
            tone={summary.lowStock > 0 ? 'warning' : 'default'}
            value={summary.lowStock}
            detail={`At or below ${summary.lowStockThreshold} units`}
          />
          <StatCard
            label="Out of stock"
            icon={<PackageX />}
            tone={summary.outOfStock > 0 ? 'warning' : 'default'}
            value={summary.outOfStock}
            detail="Can't be added to carts"
          />
        </section>
      )}

      {lowStock.isError ? (
        <EmptyState
          icon={<TriangleAlert />}
          title="Inventory unavailable"
          description={errorMessage(lowStock.error)}
          actions={<Button onClick={() => void lowStock.refetch()}>Try again</Button>}
        />
      ) : (
        <Table
          caption="Low-stock products"
          loading={lowStock.isPending}
          rows={lowStock.data ?? []}
          getRowKey={(p) => p.productId}
          empty={
            <EmptyState
              size="sm"
              headingLevel="h2"
              icon={<PackageCheck />}
              title="Everything is well stocked"
              description="Products appear here when they run low."
            />
          }
          columns={[
            {
              key: 'name',
              header: 'Product',
              cell: (p) => (
                <span className="flex flex-col">
                  <Link
                    to={`/admin/products/${p.productId}/edit`}
                    className="font-medium text-fg hover:text-accent-text"
                  >
                    {p.name}
                  </Link>
                  <span className="text-xs text-fg-muted">
                    {p.brand} · {categoryName(p.category)}
                  </span>
                </span>
              ),
            },
            {
              key: 'price',
              header: 'Price',
              numeric: true,
              hideBelow: 'md',
              cell: (p) => <Price cents={p.priceCents} size="sm" />,
            },
            {
              key: 'status',
              header: 'Status',
              hideBelow: 'sm',
              cell: (p) => <StockBadge stock={p.stock} />,
            },
            {
              key: 'restock',
              header: 'Set stock',
              align: 'right',
              cell: (p) => <RestockControl entry={p} />,
            },
          ]}
        />
      )}
    </>
  );
}

function RestockControl({ entry }: { entry: LowStockEntry }) {
  const [value, setValue] = useState(Math.max(entry.stock, 10));
  const toast = useToast();
  const update = useUpdateProduct({
    onSuccess: (p) => toast.success('Stock updated', `${p.name}: ${p.stock} units`),
    onError: (error) => toast.error("Couldn't update stock", errorMessage(error)),
  });

  return (
    <span className="inline-flex items-center gap-2">
      <QuantityStepper
        size="sm"
        min={0}
        max={9999}
        value={value}
        onChange={setValue}
        label={`New stock for ${entry.name}`}
      />
      <Button
        size="sm"
        variant={value === entry.stock ? 'secondary' : 'primary'}
        disabled={value === entry.stock}
        loading={update.isPending}
        loadingText="Saving stock"
        onClick={() => update.mutate({ id: entry.productId, input: { stock: value } })}
        aria-label={`Save stock for ${entry.name}`}
      >
        Save
      </Button>
    </span>
  );
}
