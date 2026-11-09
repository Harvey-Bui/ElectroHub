import { useEffect, useState, type ReactNode } from 'react';
import {
  Navigate,
  NavLink,
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from 'react-router';
import {
  Boxes,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
} from 'lucide-react';
import { useAdminLogout, useAdminSession } from '@/api/adminQueries';
import { LogoMark } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Badge, Button, Drawer, Spinner, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ReceiptText, end: false },
  { to: '/admin/products', label: 'Products', icon: Package, end: false },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes, end: false },
] as const;

/**
 * Admin shell and auth guard. Without a valid session (the server answers
 * 401 to /api/admin/me) the user is sent to /admin/login and brought back to
 * the page they asked for after signing in.
 */
export function AdminLayout() {
  const session = useAdminSession();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Move focus to the content on navigation, like the store layout does.
  useEffect(() => {
    if (location.key !== 'default')
      document.getElementById('admin-main')?.focus({ preventScroll: true });
  }, [location.pathname, location.key]);

  if (session.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-fg-muted">
        <Spinner size="lg" label="Checking your session" />
      </div>
    );
  }
  if (session.isError || !session.data) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  return (
    <div className="flex min-h-dvh bg-bg">
      <a
        href="#admin-main"
        className="fixed left-4 top-3 -translate-y-20 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-contrast shadow-lg transition-transform duration-base focus:translate-y-0"
        style={{ zIndex: 'var(--eh-z-toast)' }}
      >
        Skip to content
      </a>

      {/* Sidebar (laptops and up) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <SidebarContent username={session.data.username} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (phones and tablets) */}
        <header
          className="sticky top-0 flex h-14 items-center gap-2 border-b border-border bg-bg/80 px-4 backdrop-blur-xl lg:hidden"
          style={{ zIndex: 'var(--eh-z-sticky)' }}
        >
          <Button
            variant="ghost"
            iconOnly
            aria-label="Open admin menu"
            aria-haspopup="dialog"
            onClick={() => setMenuOpen(true)}
            className="-ml-2"
          >
            <Menu className="size-5" aria-hidden />
          </Button>
          <LogoMark className="size-7" />
          <span className="font-semibold text-fg">Admin</span>
          <ThemeToggle className="ml-auto" />
        </header>

        <main
          id="admin-main"
          tabIndex={-1}
          className="flex-1 px-4 py-6 focus:outline-none md:px-8 md:py-8"
        >
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        side="left"
        size="sm"
        title="ElectroHub Admin"
      >
        <SidebarContent
          username={session.data.username}
          onNavigate={() => setMenuOpen(false)}
          compact
        />
      </Drawer>
      <ScrollRestoration />
    </div>
  );
}

function SidebarContent({
  username,
  onNavigate,
  compact = false,
}: {
  username: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const logout = useAdminLogout({
    onSettled: () => {
      toast.info('Signed out');
      navigate('/admin/login', { replace: true });
    },
  });
  const signOut = () => logout.mutate();

  return (
    <div className={cn('flex h-full flex-col', !compact && 'p-4')}>
      {!compact && (
        <div className="mb-8 flex items-center gap-2.5 px-2 pt-1">
          <LogoMark />
          <span className="text-lg font-semibold tracking-tight text-fg">
            Electro<span className="text-accent-text">Hub</span>
          </span>
          <Badge variant="accent" size="sm">
            Admin
          </Badge>
        </div>
      )}
      <nav aria-label="Admin" className="flex-1">
        <ul className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-fast',
                    isActive
                      ? 'bg-accent-soft text-fg'
                      : 'text-fg-secondary hover:bg-accent-soft hover:text-fg',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('size-4', isActive && 'text-accent-text')} aria-hidden />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex h-9 items-center gap-3 rounded-md px-3 text-sm text-fg-secondary transition-colors duration-fast hover:bg-accent-soft hover:text-fg"
        >
          <ExternalLink className="size-4" aria-hidden />
          View store
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <div className="flex items-center gap-2 px-3">
          <span
            className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold uppercase text-accent-text"
            aria-hidden
          >
            {username.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-fg" title={username}>
            <span className="sr-only">Signed in as </span>
            {username}
          </span>
          {!compact && <ThemeToggle />}
          <Button
            variant="ghost"
            iconOnly
            size="sm"
            aria-label="Sign out"
            title="Sign out"
            loading={logout.isPending}
            onClick={signOut}
          >
            <LogOut className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Page title row used by every admin page. */
export function AdminPageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <div className="eh-eyebrow">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold text-fg md:text-3xl">{title}</h1>
        {description && <p className="text-sm text-fg-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
