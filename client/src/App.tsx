import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { Spinner } from '@/components/ui';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrderPage } from '@/pages/OrderPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { ProductPage } from '@/pages/ProductPage';
import { ProductsPage } from '@/pages/ProductsPage';

function PageSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center text-fg-muted">
      <Spinner size="lg" label={label} />
    </div>
  );
}

/** Lazily loads one named export of the admin bundle (a single shared chunk). */
const loadAdmin = () => import('@/pages/admin');
function adminPage(name: keyof Awaited<ReturnType<typeof loadAdmin>>): ReactNode {
  const Page = lazy(async () => ({ default: (await loadAdmin())[name] as ComponentType }));
  return (
    <Suspense fallback={<PageSpinner label="Loading admin" />}>
      <Page />
    </Suspense>
  );
}

// Dev-only design showcase. `import.meta.env.DEV` is replaced with `false` in
// production builds, so the bundler drops this import and the page entirely.
const DesignPage = import.meta.env.DEV ? lazy(() => import('@/pages/DesignPage')) : null;

const devRoutes: RouteObject[] = DesignPage
  ? [
      {
        path: 'design',
        element: (
          <Suspense fallback={<PageSpinner label="Loading design system" />}>
            <DesignPage />
          </Suspense>
        ),
      },
    ]
  : [];

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/:id', element: <ProductPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:id', element: <OrderPage /> },
      ...devRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: 'admin/login', element: adminPage('AdminLoginPage') },
  {
    path: 'admin',
    element: adminPage('AdminLayout'),
    children: [
      { index: true, element: adminPage('AdminDashboardPage') },
      { path: 'orders', element: adminPage('AdminOrdersPage') },
      { path: 'orders/:id', element: adminPage('AdminOrderPage') },
      { path: 'products', element: adminPage('AdminProductsPage') },
      { path: 'products/new', element: adminPage('AdminNewProductPage') },
      { path: 'products/:id/edit', element: adminPage('AdminEditProductPage') },
      { path: 'inventory', element: adminPage('AdminInventoryPage') },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
