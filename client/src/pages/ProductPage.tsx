import { useState } from 'react';
import { useParams } from 'react-router';
import { PackageX, ShoppingBag, Truck, TriangleAlert } from 'lucide-react';
import { ApiError } from '@/api/http';
import { useCategories, useProduct } from '@/api/queries';
import { Price } from '@/components/commerce/Price';
import { ProductImage } from '@/components/commerce/ProductImage';
import { StockBadge, stockState } from '@/components/commerce/StockStatus';
import {
  Badge,
  Breadcrumbs,
  Button,
  ButtonLink,
  EmptyState,
  QuantityStepper,
  Skeleton,
  SkeletonGroup,
  Table,
} from '@/components/ui';
import { useAddToCartWithFeedback } from '@/hooks/useAddToCart';
import { titleCase } from '@/lib/format';
import { specLabel, specValue } from '@/lib/specs';

export function ProductPage() {
  const { id = '' } = useParams();
  const product = useProduct(id);
  const categories = useCategories();
  const { add, pendingId } = useAddToCartWithFeedback();
  const [quantity, setQuantity] = useState(1);

  if (product.isPending) {
    return (
      <SkeletonGroup
        label="Loading product"
        className="eh-container grid gap-10 py-10 lg:grid-cols-2"
      >
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-32" />
          <Skeleton shape="text" lines={4} />
        </div>
      </SkeletonGroup>
    );
  }

  if (product.isError) {
    const notFound = product.error instanceof ApiError && product.error.status === 404;
    return (
      <div className="eh-container py-16">
        <EmptyState
          headingLevel="h2"
          icon={notFound ? <PackageX /> : <TriangleAlert />}
          title={notFound ? 'Product not found' : "We couldn't load this product"}
          description={
            notFound
              ? 'It may have been removed from the catalogue.'
              : 'Please try again in a moment.'
          }
          actions={
            notFound ? (
              <ButtonLink to="/products">Browse products</ButtonLink>
            ) : (
              <Button onClick={() => void product.refetch()}>Try again</Button>
            )
          }
        />
      </div>
    );
  }

  const p = product.data;
  const categoryName =
    categories.data?.find((c) => c.slug === p.category)?.name ?? titleCase(p.category);
  const outOfStock = stockState(p.stock) === 'out';
  const specs = Object.entries(p.specs).map(([key, value]) => ({
    key,
    label: specLabel(key),
    value: specValue(key, value),
  }));

  return (
    <div className="eh-container py-8 md:py-12">
      <Breadcrumbs
        className="mb-8"
        items={[
          { label: 'Products', href: '/products' },
          { label: categoryName, href: `/products?category=${p.category}` },
          { label: p.name },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductImage
            product={p}
            priority
            aspect="aspect-square"
            className="rounded-2xl border border-border"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="eh-eyebrow">{p.brand}</p>
            <h1 className="text-3xl font-semibold text-fg md:text-4xl">{p.name}</h1>
            <div className="flex flex-wrap gap-2">
              <StockBadge stock={p.stock} showInStock />
              {p.featured && <Badge variant="accent">Featured</Badge>}
              <Badge variant="outline">{categoryName}</Badge>
            </div>
          </div>

          <Price cents={p.priceCents} size="xl" />

          <p className="text-base leading-relaxed text-fg-secondary">{p.description}</p>

          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center gap-3">
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={Math.max(1, Math.min(p.stock, 99))}
                disabled={outOfStock}
                label={`Quantity for ${p.name}`}
              />
              <Button
                size="lg"
                className="flex-1"
                leftIcon={<ShoppingBag />}
                disabled={outOfStock}
                loading={pendingId === p.id}
                loadingText="Adding to cart"
                onClick={() => add(p, quantity)}
              >
                {outOfStock ? 'Out of stock' : 'Add to cart'}
              </Button>
            </div>
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              <Truck className="size-4 text-accent-text" aria-hidden />
              Free shipping on orders over $100. Stock is reserved at checkout.
            </p>
          </div>

          {specs.length > 0 && (
            <section aria-labelledby="specs-title" className="flex flex-col gap-3">
              <h2 id="specs-title" className="text-lg font-semibold text-fg">
                Specifications
              </h2>
              <Table
                caption={`${p.name} specifications`}
                density="compact"
                striped
                rows={specs}
                getRowKey={(r) => r.key}
                columns={[
                  { key: 'label', header: 'Specification', className: 'w-2/5' },
                  {
                    key: 'value',
                    header: 'Value',
                    cell: (r) => <span className="eh-numeric text-fg">{r.value}</span>,
                  },
                ]}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
