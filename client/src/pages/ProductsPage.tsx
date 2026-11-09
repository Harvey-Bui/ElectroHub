import { useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, SearchX, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import { useCategories, useProducts } from '@/api/queries';
import {
  CATEGORY_SLUGS,
  type CategorySlug,
  type ProductQuery,
  type ProductSort,
} from '@/api/types';
import { ProductCard, ProductCardSkeleton } from '@/components/commerce/ProductCard';
import {
  Breadcrumbs,
  Button,
  EmptyState,
  Select,
  SkeletonGroup,
  type Crumb,
} from '@/components/ui';
import { useAddToCartWithFeedback } from '@/hooks/useAddToCart';
import { cn } from '@/lib/cn';
import { plural, titleCase } from '@/lib/format';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'best-selling', label: 'Best selling' },
];
const PAGE_SIZE = 12;

/** Reads the listing state from the URL so it is shareable and survives reloads. */
function useListingParams() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category');
  const sort = params.get('sort');
  const query: ProductQuery = {
    q: params.get('q') ?? undefined,
    category: CATEGORY_SLUGS.includes(category as CategorySlug)
      ? (category as CategorySlug)
      : undefined,
    sort: SORTS.some((s) => s.value === sort) ? (sort as ProductSort) : 'newest',
    inStock: params.get('inStock') === 'true' ? true : undefined,
    featured: params.get('featured') === 'true' ? true : undefined,
    page: Math.max(1, Number(params.get('page')) || 1),
    limit: PAGE_SIZE,
  };
  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page'); // new filters start at page 1
    setParams(next);
  };
  return { query, update };
}

export function ProductsPage() {
  const { query, update } = useListingParams();
  const products = useProducts(query);
  const categories = useCategories();
  const { add, pendingId } = useAddToCartWithFeedback();

  const categoryName = query.category
    ? (categories.data?.find((c) => c.slug === query.category)?.name ?? titleCase(query.category))
    : undefined;
  const title = query.q
    ? `Results for “${query.q}”`
    : (categoryName ?? (query.featured ? 'Featured products' : 'All products'));
  const crumbs: Crumb[] = [{ label: 'Products', href: '/products' }];
  if (categoryName) crumbs.push({ label: categoryName });
  if (query.q) crumbs.push({ label: `Search: ${query.q}` });
  if (!categoryName && !query.q) crumbs[0] = { label: title };

  const page = products.data?.pagination;
  const hasFilters = Boolean(query.q || query.category || query.inStock || query.featured);

  return (
    <div className="eh-container py-8 md:py-12">
      <Breadcrumbs items={crumbs} className="mb-6" />

      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-fg md:text-4xl">{title}</h1>
        <p className="text-sm text-fg-muted" aria-live="polite">
          {page ? plural(page.total, 'product') : ' '}
        </p>
      </header>

      {/* Toolbar: category chips + sort + stock toggle */}
      <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
        <nav
          aria-label="Filter by category"
          className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex gap-2">
            <li>
              <Chip active={!query.category} onClick={() => update({ category: undefined })}>
                All
              </Chip>
            </li>
            {(categories.data ?? []).map((c) => (
              <li key={c.slug}>
                <Chip
                  active={query.category === c.slug}
                  onClick={() => update({ category: c.slug })}
                >
                  {c.name}
                </Chip>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-sunken px-3 text-sm text-fg-secondary hover:border-border-strong">
            <input
              type="checkbox"
              checked={query.inStock === true}
              onChange={(e) => update({ inStock: e.target.checked ? 'true' : undefined })}
              className="size-4 accent-(--eh-accent)"
            />
            In stock only
          </label>
          <Select
            label="Sort by"
            hideLabel
            leftIcon={<SlidersHorizontal />}
            value={query.sort}
            onChange={(e) =>
              update({ sort: e.target.value === 'newest' ? undefined : e.target.value })
            }
            options={SORTS}
            wrapperClassName="w-56"
          />
        </div>
      </div>

      {products.isPending ? (
        <SkeletonGroup
          label="Loading products"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {Array.from({ length: 8 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </SkeletonGroup>
      ) : products.isError ? (
        <EmptyState
          icon={<TriangleAlert />}
          title="We couldn't load products"
          description="The store API didn't respond. Check that the server and Redis are running."
          actions={<Button onClick={() => void products.refetch()}>Try again</Button>}
        />
      ) : products.data.data.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No products match"
          description={
            query.q
              ? `Nothing matched “${query.q}”. Try a brand or category, like “Logitech” or “monitor”.`
              : 'Try removing a filter.'
          }
          actions={
            hasFilters && (
              <Button
                variant="secondary"
                onClick={() =>
                  update({
                    q: undefined,
                    category: undefined,
                    inStock: undefined,
                    featured: undefined,
                  })
                }
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul
            className={cn(
              'grid gap-4 transition-opacity duration-base sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
              products.isPlaceholderData && 'opacity-60',
            )}
            aria-busy={products.isPlaceholderData || undefined}
          >
            {products.data.data.map((p, i) => (
              <li key={p.id} className="flex">
                <ProductCard
                  product={p}
                  onAddToCart={add}
                  adding={pendingId === p.id}
                  headingLevel="h2"
                  priority={i < 4}
                  className="w-full"
                />
              </li>
            ))}
          </ul>
          {page && page.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                leftIcon={<ChevronLeft />}
                disabled={page.page <= 1}
                onClick={() => update({ page: String(page.page - 1) })}
              >
                Previous
              </Button>
              <span className="eh-numeric text-sm text-fg-secondary" aria-current="page">
                {page.page} / {page.totalPages}
              </span>
              <Button
                variant="secondary"
                rightIcon={<ChevronRight />}
                disabled={page.page >= page.totalPages}
                onClick={() => update({ page: String(page.page + 1) })}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-9 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors duration-fast',
        active
          ? 'border-accent bg-accent-soft text-fg'
          : 'border-border text-fg-secondary hover:border-border-strong hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}
