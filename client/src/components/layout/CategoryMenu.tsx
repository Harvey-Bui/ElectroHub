import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useCategories } from '@/api/queries';
import { CATEGORY_SLUGS } from '@/api/types';
import { ProductIllustration } from '@/components/commerce/ProductIllustration';
import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { titleCase } from '@/lib/format';

/**
 * "Categories" disclosure for the desktop navbar: a button (aria-expanded)
 * that reveals a panel of category links with live product counts. Closes on
 * Esc (returning focus to the button), outside click, or navigation.
 */
export function CategoryMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const categories = useCategories();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const list =
    categories.data ??
    CATEGORY_SLUGS.map((slug) => ({ slug, name: titleCase(slug), productCount: undefined }));

  return (
    <div
      ref={rootRef}
      className={cn('relative', className)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-10 items-center gap-1 rounded-md px-3 text-sm font-medium transition-colors duration-fast',
          open ? 'bg-accent-soft text-fg' : 'text-fg-secondary hover:bg-accent-soft hover:text-fg',
        )}
      >
        Categories
        <ChevronDown
          className={cn('size-4 transition-transform duration-base', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute left-0 top-full mt-2 w-[min(40rem,calc(100vw-2rem))] rounded-xl border border-border bg-elevated p-3 shadow-xl motion-safe:animate-[eh-fade-up_var(--eh-duration-base)_var(--eh-ease-standard)]"
        style={{ zIndex: 'var(--eh-z-dropdown)' }}
      >
        <ul className="grid grid-cols-2 gap-1">
          {list.map((c) => (
            <li key={c.slug}>
              <Link
                to={`/products?category=${c.slug}`}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 rounded-lg p-2.5 transition-colors duration-fast hover:bg-accent-soft"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-linear-to-b from-stage-from to-stage-to p-1.5 text-fg-muted group-hover:text-fg-secondary">
                  <ProductIllustration category={c.slug} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-fg">{c.name}</span>
                  <span className="text-xs text-fg-muted">
                    {c.productCount === undefined ? (
                      <Skeleton className="mt-1 h-3 w-16" />
                    ) : (
                      `${c.productCount} products`
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          to="/products"
          onClick={() => setOpen(false)}
          className="mt-2 flex items-center justify-between rounded-lg border-t border-border px-2.5 pt-3 text-sm font-medium text-accent-text hover:underline"
        >
          Shop all products
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
