import { useState } from 'react';
import type { CategorySlug } from '@/api/types';
import { cn } from '@/lib/cn';
import { ProductIllustration } from './ProductIllustration';

/** Hosts that serve generic placeholders (the seed data uses these until real photos are uploaded). */
const PLACEHOLDER_HOSTS = new Set(['placehold.co', 'via.placeholder.com', 'dummyimage.com']);

export function isPlaceholderImage(url: string): boolean {
  try {
    return PLACEHOLDER_HOSTS.has(new URL(url).hostname);
  } catch {
    return true;
  }
}

export interface ProductImageProps {
  product: { name: string; category: CategorySlug; imageUrl: string };
  /** Tailwind aspect utility. */
  aspect?: string;
  /** Load eagerly for above-the-fold images (hero, product page). */
  priority?: boolean;
  /** Scales the art up slightly when an ancestor with `group` is hovered. */
  zoomOnHover?: boolean;
  className?: string;
}

/**
 * Product visual on a softly lit "stage". Real photos are shown with
 * object-contain; placeholder URLs and broken images fall back to the
 * category illustration, so the grid never shows a grey box or alt text.
 */
export function ProductImage({
  product,
  aspect = 'aspect-[4/3]',
  priority = false,
  zoomOnHover = false,
  className,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const useIllustration = failed || isPlaceholderImage(product.imageUrl);
  const zoom =
    zoomOnHover &&
    'transition-transform duration-slow ease-standard group-hover:scale-[1.04] motion-reduce:group-hover:scale-100';

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden bg-linear-to-b from-stage-from to-stage-to',
        aspect,
        className,
      )}
    >
      {/* Spotlight behind the product */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 55% at 50% 42%, var(--eh-accent-glow) 0%, transparent 70%)',
          opacity: 0.55,
        }}
      />
      {useIllustration ? (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center p-[12%] text-fg-muted',
            zoom,
          )}
        >
          <ProductIllustration category={product.category} className="max-h-full drop-shadow-sm" />
          <span className="sr-only">{product.name}</span>
        </div>
      ) : (
        <img
          src={product.imageUrl}
          alt={product.name}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-contain p-[8%]', zoom)}
        />
      )}
    </div>
  );
}
