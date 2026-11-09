import { Link } from 'react-router';
import { ArrowRight, Sparkles, TriangleAlert } from 'lucide-react';
import { useCategories, useFeaturedProducts, useProducts } from '@/api/queries';
import type { Product } from '@/api/types';
import { Price } from '@/components/commerce/Price';
import { ProductCard, ProductCardSkeleton } from '@/components/commerce/ProductCard';
import { ProductIllustration } from '@/components/commerce/ProductIllustration';
import { ProductImage } from '@/components/commerce/ProductImage';
import { Badge, Button, ButtonLink, EmptyState, Skeleton, SkeletonGroup } from '@/components/ui';
import { useAddToCartWithFeedback } from '@/hooks/useAddToCart';
import { specHighlights } from '@/lib/specs';

export function HomePage() {
  const featured = useFeaturedProducts(8);
  const hero = featured.data?.[0];

  return (
    <>
      <Hero product={hero} loading={featured.isPending} />
      <CategoryShowcase />
      <ProductRail
        id="featured"
        eyebrow="Hand-picked"
        title="Featured gear"
        products={featured.data?.slice(0, 4)}
        loading={featured.isPending}
        error={featured.isError}
        onRetry={() => void featured.refetch()}
        href="/products?featured=true"
      />
      <BestSellers />
    </>
  );
}

function Hero({ product, loading }: { product?: Product; loading: boolean }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden border-b border-border"
    >
      {/* Ambient light */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 60% at 75% 30%, var(--eh-accent-glow) 0%, transparent 70%), radial-gradient(40% 40% at 10% 90%, var(--eh-accent-soft) 0%, transparent 70%)',
        }}
      />
      <div className="eh-container relative grid items-center gap-12 py-16 md:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="accent" icon={<Sparkles />}>
            New season line-up is in
          </Badge>
          <h1 id="hero-title" className="text-4xl font-semibold text-fg sm:text-5xl lg:text-6xl">
            Serious hardware for <span className="text-accent-text">what you do next.</span>
          </h1>
          <p className="max-w-xl text-lg text-fg-secondary">
            Gaming laptops, OLED displays, studio microphones and everything in between. Live stock,
            honest specs, free shipping over $100.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/products" size="lg" rightIcon={<ArrowRight />}>
              Shop all products
            </ButtonLink>
            <ButtonLink to="/products?category=gaming-laptops" size="lg" variant="secondary">
              Gaming laptops
            </ButtonLink>
          </div>
        </div>

        <div className="relative">
          {loading || !product ? (
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          ) : (
            <Link
              to={`/products/${product.id}`}
              className="group block overflow-hidden rounded-2xl border border-border bg-surface shadow-xl transition-shadow duration-slow hover:shadow-glow"
            >
              <ProductImage product={product} priority zoomOnHover aspect="aspect-[4/3]" />
              <div className="flex items-end justify-between gap-4 border-t border-border p-5">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-fg-muted">{product.brand}</p>
                  <p className="truncate text-lg font-semibold text-fg">{product.name}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Key specifications">
                    {specHighlights(product.specs).map((s) => (
                      <li
                        key={s}
                        className="eh-numeric rounded-sm bg-sunken px-1.5 py-0.5 text-xs text-fg-secondary"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <Price cents={product.priceCents} size="lg" className="shrink-0" />
              </div>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  href,
}: {
  id: string;
  eyebrow: string;
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <p className="eh-eyebrow">{eyebrow}</p>
        <h2 id={id} className="text-2xl font-semibold text-fg md:text-3xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          to={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent-text hover:underline"
        >
          View all <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function CategoryShowcase() {
  const categories = useCategories();
  return (
    <section aria-labelledby="categories-title" className="eh-container py-16 md:py-20">
      <SectionHeading
        id="categories-title"
        eyebrow="Shop by category"
        title="Find your next setup"
      />
      {categories.isPending ? (
        <SkeletonGroup
          label="Loading categories"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </SkeletonGroup>
      ) : categories.isError ? (
        <EmptyState
          size="sm"
          icon={<TriangleAlert />}
          title="Categories are unavailable right now"
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.data.map((c, i) => (
            <li
              key={c.slug}
              className={
                i === 0 ? 'col-span-2 sm:col-span-1 lg:col-span-2 lg:row-span-2' : undefined
              }
            >
              <Link
                to={`/products?category=${c.slug}`}
                className="group relative flex h-full min-h-36 flex-col justify-between overflow-hidden rounded-lg border border-border bg-linear-to-b from-stage-from to-stage-to p-4 transition-[border-color,box-shadow] duration-base hover:border-border-strong hover:shadow-lg"
              >
                <ProductIllustration
                  category={c.slug}
                  className={
                    i === 0
                      ? 'mx-auto my-4 max-w-80 text-fg-muted transition-transform duration-slow group-hover:scale-105'
                      : 'ml-auto w-24 text-fg-muted transition-transform duration-slow group-hover:scale-105'
                  }
                />
                <span className="flex items-end justify-between gap-2">
                  <span className="flex flex-col">
                    <span
                      className={
                        i === 0 ? 'text-xl font-semibold text-fg' : 'text-sm font-semibold text-fg'
                      }
                    >
                      {c.name}
                    </span>
                    <span className="text-xs text-fg-muted">{c.productCount} products</span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-fg-muted transition-transform duration-base group-hover:translate-x-0.5 group-hover:text-accent-text"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface ProductRailProps {
  id: string;
  eyebrow: string;
  title: string;
  products?: Product[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  href: string;
}

function ProductRail({
  id,
  eyebrow,
  title,
  products,
  loading,
  error,
  onRetry,
  href,
}: ProductRailProps) {
  const { add, pendingId } = useAddToCartWithFeedback();
  return (
    <section aria-labelledby={`${id}-title`} className="eh-container py-12 md:py-16">
      <SectionHeading id={`${id}-title`} eyebrow={eyebrow} title={title} href={href} />
      {loading ? (
        <SkeletonGroup
          label={`Loading ${title.toLowerCase()}`}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </SkeletonGroup>
      ) : error ? (
        <EmptyState
          size="sm"
          icon={<TriangleAlert />}
          title="We couldn't load these products"
          actions={
            <Button size="sm" onClick={onRetry}>
              Retry
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(products ?? []).map((p) => (
            <li key={p.id} className="flex">
              <ProductCard
                product={p}
                onAddToCart={add}
                adding={pendingId === p.id}
                className="w-full"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BestSellers() {
  const query = useProducts({ sort: 'best-selling', inStock: true, limit: 4 });
  return (
    <ProductRail
      id="trending"
      eyebrow="Trending now"
      title="Best sellers in stock"
      products={query.data?.data}
      loading={query.isPending}
      error={query.isError}
      onRetry={() => void query.refetch()}
      href="/products?sort=best-selling"
    />
  );
}
