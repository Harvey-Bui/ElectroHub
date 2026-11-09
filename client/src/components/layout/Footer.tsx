import { Link } from 'react-router';
import { RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { useCategories } from '@/api/queries';
import { ApiStatus } from '@/components/ApiStatus';
import { Logo } from './Logo';

const perks = [
  { icon: Truck, title: 'Free shipping over $100', text: 'Flat $9.99 below that.' },
  { icon: ShieldCheck, title: 'Authorised retailer', text: 'Full manufacturer warranty.' },
  { icon: RotateCcw, title: 'Cancel before shipping', text: 'Stock returns instantly.' },
];

/** Site footer: store promises, shop links (live categories), system status. */
export function Footer() {
  const categories = useCategories();
  const link = 'text-sm text-fg-secondary transition-colors duration-fast hover:text-fg';

  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="eh-container">
        <ul className="grid gap-6 border-b border-border py-10 sm:grid-cols-3">
          {perks.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-fg">{title}</span>
                <span className="text-sm text-fg-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="flex max-w-xs flex-col gap-4">
            <Logo />
            <p className="text-sm text-fg-secondary">
              Laptops, desktops, displays, audio and peripherals, chosen for people who care about
              their gear.
            </p>
          </div>
          <nav aria-labelledby="footer-shop">
            <h2 id="footer-shop" className="eh-eyebrow mb-4">
              Shop
            </h2>
            <ul className="flex flex-col gap-2.5">
              {(categories.data ?? []).map((c) => (
                <li key={c.slug}>
                  <Link to={`/products?category=${c.slug}`} className={link}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="footer-browse">
            <h2 id="footer-browse" className="eh-eyebrow mb-4">
              Browse
            </h2>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link to="/products" className={link}>
                  All products
                </Link>
              </li>
              <li>
                <Link to="/products?featured=true" className={link}>
                  Featured
                </Link>
              </li>
              <li>
                <Link to="/products?sort=best-selling" className={link}>
                  Best sellers
                </Link>
              </li>
              <li>
                <Link to="/products?inStock=true&sort=price-asc" className={link}>
                  In stock, lowest price
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-border py-6 text-xs text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ElectroHub. A university project, powered by Redis.</p>
          <ApiStatus compact />
        </div>
      </div>
    </footer>
  );
}
