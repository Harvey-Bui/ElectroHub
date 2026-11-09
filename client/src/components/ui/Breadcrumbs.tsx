import { ChevronRight, House } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

export interface Crumb {
  label: string;
  /** Omit for the current page (always the last crumb). */
  href?: string;
}

export interface BreadcrumbsProps {
  items: Crumb[];
  /** Prepend a "Home" crumb with an icon. Default true. */
  showHome?: boolean;
  className?: string;
}

/**
 * Location trail: <nav aria-label="Breadcrumb"> → <ol>, with the last item
 * marked aria-current="page". Long labels are truncated with a title tooltip.
 */
export function Breadcrumbs({ items, showHome = true, className }: BreadcrumbsProps) {
  const all: Crumb[] = showHome ? [{ label: 'Home', href: '/' }, ...items] : items;
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-fg-muted">
        {all.map((crumb, i) => {
          const last = i === all.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-fg-muted" aria-hidden />}
              {last || !crumb.href ? (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={cn('max-w-[24ch] truncate', last && 'font-medium text-fg')}
                  title={crumb.label}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.href}
                  className="inline-flex max-w-[24ch] items-center gap-1 truncate rounded-xs transition-colors duration-fast hover:text-fg"
                  title={crumb.label}
                >
                  {showHome && i === 0 && <House className="size-3.5 shrink-0" aria-hidden />}
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
