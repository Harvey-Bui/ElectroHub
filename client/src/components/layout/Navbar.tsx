import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Menu, ShoppingBag } from 'lucide-react';
import { useCart, useCategories } from '@/api/queries';
import { CATEGORY_SLUGS } from '@/api/types';
import { Button, Drawer } from '@/components/ui';
import { cn } from '@/lib/cn';
import { titleCase } from '@/lib/format';
import { useCartUi } from '@/store/cartUi';
import { CategoryMenu } from './CategoryMenu';
import { Logo } from './Logo';
import { SearchForm } from './SearchForm';
import { ThemeToggle } from './ThemeToggle';

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex h-10 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors duration-fast',
    isActive ? 'text-fg' : 'text-fg-secondary hover:bg-accent-soft hover:text-fg',
  );

/**
 * Sticky, translucent top bar.
 * ≥ lg: logo · Home · All products · Orders · Categories · search · theme · cart
 * < lg: menu · logo · theme · cart, with search under the bar and the
 *       links in a left drawer.
 */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { open: openCart } = useCartUi();
  const cart = useCart();
  const count = cart.data?.itemCount ?? 0;
  const location = useLocation();
  // "All products" is active on /products without filters; Home only on "/".
  const onProducts = location.pathname === '/products';

  return (
    <header
      className="sticky top-0 border-b border-border bg-bg/80 backdrop-blur-xl supports-[not(backdrop-filter:blur(0))]:bg-bg"
      style={{ zIndex: 'var(--eh-z-sticky)' }}
    >
      <div className="eh-container flex h-16 items-center gap-2 lg:gap-6">
        <Button
          variant="ghost"
          iconOnly
          className="-ml-2 lg:hidden"
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="size-5" aria-hidden />
        </Button>

        <Logo />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            <li>
              <NavLink to="/" end className={navLink}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/products"
                className={() => navLink({ isActive: onProducts && !location.search })}
              >
                All products
              </NavLink>
            </li>
            <li>
              <NavLink to="/orders" className={navLink}>
                Orders
              </NavLink>
            </li>
            <li>
              <CategoryMenu />
            </li>
          </ul>
        </nav>

        <SearchForm shortcut className="ml-auto hidden w-full max-w-sm md:block" />

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <ThemeToggle />
          <Button
            variant="ghost"
            iconOnly
            onClick={openCart}
            aria-haspopup="dialog"
            aria-label={
              count > 0 ? `Open cart, ${count} item${count === 1 ? '' : 's'}` : 'Open cart, empty'
            }
            className="relative -mr-2 md:mr-0"
          >
            <ShoppingBag className="size-5" aria-hidden />
            {count > 0 && (
              <span
                aria-hidden
                className="eh-numeric absolute right-0.5 top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[0.6875rem] font-semibold leading-none text-accent-contrast ring-2 ring-bg"
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Search gets its own row on phones and small tablets. */}
      <div className="eh-container pb-3 md:hidden">
        <SearchForm />
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useCategories();
  const list =
    categories.data ??
    CATEGORY_SLUGS.map((slug) => ({ slug, name: titleCase(slug), productCount: undefined }));
  const item =
    'flex h-11 items-center justify-between rounded-md px-3 text-sm font-medium text-fg-secondary transition-colors duration-fast hover:bg-accent-soft hover:text-fg aria-[current=page]:text-fg';

  return (
    <Drawer open={open} onClose={onClose} side="left" size="sm" title={<Logo onClick={onClose} />}>
      <nav aria-label="Mobile" className="flex flex-col gap-6">
        <ul className="flex flex-col">
          <li>
            <NavLink to="/" end onClick={onClose} className={item}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/products" end onClick={onClose} className={item}>
              All products
            </NavLink>
          </li>
          <li>
            <NavLink to="/orders" onClick={onClose} className={item}>
              Your orders
            </NavLink>
          </li>
        </ul>
        <div>
          <p className="eh-eyebrow mb-2 px-3">Categories</p>
          <ul className="flex flex-col">
            {list.map((c) => (
              <li key={c.slug}>
                <NavLink to={`/products?category=${c.slug}`} onClick={onClose} className={item}>
                  {c.name}
                  {c.productCount !== undefined && (
                    <span className="eh-numeric text-xs text-fg-muted">{c.productCount}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </Drawer>
  );
}
