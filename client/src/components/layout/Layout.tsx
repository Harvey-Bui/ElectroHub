import { useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { CartDrawer } from '@/components/commerce/CartDrawer';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

/**
 * App shell: skip link → sticky navbar → <main> → footer, plus the cart
 * drawer. Moves focus to <main> on navigation so keyboard and screen-reader
 * users start at the new page's content.
 */
export function Layout() {
  const location = useLocation();

  useEffect(() => {
    // Skip the very first render; focus only on client-side navigations.
    if (location.key === 'default') return;
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [location.pathname, location.key]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="fixed left-4 top-3 -translate-y-20 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-contrast shadow-lg transition-transform duration-base focus:translate-y-0"
        style={{ zIndex: 'var(--eh-z-toast)' }}
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <ScrollRestoration />
    </div>
  );
}
