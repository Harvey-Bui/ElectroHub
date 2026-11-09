import { useId } from 'react';
import { Link } from 'react-router';
import { Plus, Sparkles } from 'lucide-react';
import type { Product } from '@/api/types';
import { Badge, Button, Card, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { specHighlights } from '@/lib/specs';
import { Price } from './Price';
import { ProductImage } from './ProductImage';
import { StockBadge, stockState } from './StockStatus';

export interface ProductCardProps {
  product: Product;
  /** Show the quick "add to cart" button. Omit for read-only listings. */
  onAddToCart?: (product: Product) => void;
  /** True while this product is being added. */
  adding?: boolean;
  /** Heading level for the product name, to fit the page outline. */
  headingLevel?: 'h2' | 'h3';
  /** Load the image eagerly (first row of a grid). */
  priority?: boolean;
  className?: string;
}

/**
 * Product tile for grids. The product name is the link and covers the whole
 * card (stretched link), so there is one tab stop per card plus the separate
 * "Add to cart" button. Stock and featured status are shown as text badges.
 */
export function ProductCard({
  product,
  onAddToCart,
  adding = false,
  headingLevel: Heading = 'h3',
  priority = false,
  className,
}: ProductCardProps) {
  const nameId = useId();
  const href = `/products/${product.id}`;
  const outOfStock = stockState(product.stock) === 'out';
  const highlights = specHighlights(product.specs);

  return (
    <Card
      as="article"
      padding="none"
      interactive
      aria-labelledby={nameId}
      className={cn('group flex flex-col overflow-hidden', className)}
    >
      <div className="relative">
        <ProductImage product={product} priority={priority} zoomOnHover />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.featured && (
            <Badge variant="solid" size="sm" icon={<Sparkles />}>
              Featured
            </Badge>
          )}
          <StockBadge stock={product.stock} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 border-t border-border p-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {product.brand}
          </p>
          <Heading id={nameId} className="text-base font-semibold leading-snug text-fg">
            <Link
              to={href}
              className="rounded-xs after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              <span className="line-clamp-2">{product.name}</span>
            </Link>
          </Heading>
        </div>

        {highlights.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Key specifications">
            {highlights.map((h) => (
              <li
                key={h}
                className="eh-numeric rounded-sm border border-border bg-sunken px-1.5 py-0.5 text-xs text-fg-secondary"
              >
                {h}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <Price cents={product.priceCents} size="lg" />
          {onAddToCart && (
            <Button
              size="sm"
              variant={outOfStock ? 'secondary' : 'primary'}
              disabled={outOfStock}
              loading={adding}
              loadingText={`Adding ${product.name}`}
              onClick={() => onAddToCart(product)}
              aria-label={
                outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`
              }
              leftIcon={outOfStock ? undefined : <Plus />}
              className="relative z-10"
            >
              {outOfStock ? 'Sold out' : 'Add'}
            </Button>
          )}
        </div>
      </div>
      {/* Keyboard focus on the stretched link draws the ring around the whole card. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-focus opacity-0 transition-opacity duration-fast group-has-[a:focus-visible]:opacity-100"
      />
    </Card>
  );
}

/** Same footprint as ProductCard, for loading grids. */
export function ProductCardSkeleton() {
  return (
    <Card padding="none" className="overflow-hidden" aria-hidden>
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-col gap-3 border-t border-border p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton shape="text" lines={2} />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </Card>
  );
}
