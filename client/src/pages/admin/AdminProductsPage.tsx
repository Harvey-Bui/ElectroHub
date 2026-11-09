import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PackageSearch, Pencil, Plus, Search, Trash2, TriangleAlert } from 'lucide-react';
import { useDeleteProduct } from '@/api/adminQueries';
import { errorMessage } from '@/api/http';
import { useCategories, useProducts } from '@/api/queries';
import { CATEGORY_SLUGS, type CategorySlug, type Product } from '@/api/types';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { Price } from '@/components/commerce/Price';
import { ProductImage } from '@/components/commerce/ProductImage';
import { StockBadge } from '@/components/commerce/StockStatus';
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Select,
  Table,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { titleCase } from '@/lib/format';

const PAGE_SIZE = 20;

export function AdminProductsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const rawCategory = params.get('category');
  const category = CATEGORY_SLUGS.includes(rawCategory as CategorySlug)
    ? (rawCategory as CategorySlug)
    : undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const toast = useToast();

  const products = useProducts({
    q: q || undefined,
    category,
    page,
    limit: PAGE_SIZE,
    sort: 'newest',
  });
  const categories = useCategories();
  const remove = useDeleteProduct({
    onSuccess: () => {
      toast.success('Product deleted', toDelete?.name);
      setToDelete(null);
    },
    onError: (error) => {
      toast.error("Couldn't delete the product", errorMessage(error));
      setToDelete(null);
    },
  });

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    update({ q: search.trim() || undefined });
  };

  const categoryName = (slug: CategorySlug) =>
    categories.data?.find((c) => c.slug === slug)?.name ?? titleCase(slug);

  return (
    <>
      <AdminPageHeader
        title="Products"
        description={products.data ? `${products.data.pagination.total} products` : 'Catalogue'}
        actions={
          <ButtonLink to="/admin/products/new" leftIcon={<Plus />}>
            New product
          </ButtonLink>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <form role="search" onSubmit={submitSearch} className="flex flex-1 gap-2">
          <Input
            label="Search products"
            hideLabel
            type="search"
            placeholder="Search by name, brand or category"
            leftIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="flex-1"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <Select
          label="Category"
          hideLabel
          value={category ?? ''}
          onChange={(e) => update({ category: e.target.value || undefined })}
          options={[
            { value: '', label: 'All categories' },
            ...(categories.data ?? []).map((c) => ({ value: c.slug, label: c.name })),
          ]}
          wrapperClassName="sm:w-56"
        />
      </div>

      {products.isError ? (
        <EmptyState
          icon={<TriangleAlert />}
          title="Products unavailable"
          description={errorMessage(products.error)}
          actions={<Button onClick={() => void products.refetch()}>Try again</Button>}
        />
      ) : (
        <>
          <Table
            caption="Products"
            loading={products.isPending}
            loadingRows={8}
            rows={products.data?.data ?? []}
            getRowKey={(p) => p.id}
            className={cn(products.isPlaceholderData && 'opacity-60')}
            empty={
              <EmptyState
                size="sm"
                headingLevel="h2"
                icon={<PackageSearch />}
                title="No products found"
                description={
                  q || category
                    ? 'Try a different search or category.'
                    : 'Create your first product.'
                }
              />
            }
            columns={[
              {
                key: 'name',
                header: 'Product',
                cell: (p) => (
                  <span className="flex items-center gap-3">
                    <ProductImage
                      product={p}
                      aspect="aspect-square"
                      className="size-10 shrink-0 rounded-md border border-border"
                    />
                    <span className="flex min-w-0 flex-col">
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="truncate font-medium text-fg hover:text-accent-text"
                      >
                        {p.name}
                      </Link>
                      <span className="eh-numeric truncate text-xs text-fg-muted">{p.id}</span>
                    </span>
                  </span>
                ),
              },
              {
                key: 'category',
                header: 'Category',
                hideBelow: 'md',
                cell: (p) => categoryName(p.category),
              },
              {
                key: 'price',
                header: 'Price',
                numeric: true,
                cell: (p) => <Price cents={p.priceCents} size="sm" />,
              },
              {
                key: 'stock',
                header: 'Stock',
                numeric: true,
                cell: (p) => (
                  <span className="inline-flex items-center justify-end gap-2">
                    <span className="hidden lg:inline-flex">
                      <StockBadge stock={p.stock} />
                    </span>
                    <span className="eh-numeric">{p.stock}</span>
                  </span>
                ),
              },
              {
                key: 'featured',
                header: 'Featured',
                hideBelow: 'lg',
                cell: (p) =>
                  p.featured ? (
                    <Badge variant="accent" size="sm">
                      Featured
                    </Badge>
                  ) : (
                    <span className="text-fg-muted">–</span>
                  ),
              },
              {
                key: 'actions',
                header: <span className="sr-only">Actions</span>,
                align: 'right',
                cell: (p) => (
                  <span className="inline-flex gap-1">
                    <ButtonLink
                      to={`/admin/products/${p.id}/edit`}
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </ButtonLink>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Delete ${p.name}`}
                      onClick={() => setToDelete(p)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </span>
                ),
              },
            ]}
          />
          {products.data && (
            <Pagination
              page={products.data.pagination.page}
              totalPages={products.data.pagination.totalPages}
              onPageChange={(p) => update({ page: p > 1 ? String(p) : undefined })}
            />
          )}
        </>
      )}

      <Modal
        open={toDelete !== null}
        onClose={() => !remove.isPending && setToDelete(null)}
        role="alertdialog"
        size="sm"
        closeOnBackdrop={false}
        title={`Delete ${toDelete?.name ?? 'product'}?`}
        description="It's removed from the catalogue, every index and inventory. Past orders keep their copy. This can't be undone."
        footer={
          <>
            <Button
              variant="secondary"
              data-autofocus
              disabled={remove.isPending}
              onClick={() => setToDelete(null)}
            >
              Keep product
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              loadingText="Deleting"
              onClick={() => toDelete && remove.mutate(toDelete.id)}
            >
              Delete product
            </Button>
          </>
        }
      />
    </>
  );
}
