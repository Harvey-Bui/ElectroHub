import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { Spinner } from '@/components/ui';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProductPage } from '@/pages/ProductPage';
import { ProductsPage } from '@/pages/ProductsPage';

// Dev-only design showcase. `import.meta.env.DEV` is replaced with `false` in
// production builds, so Rollup drops this import and the page entirely.
const DesignPage = import.meta.env.DEV ? lazy(() => import('@/pages/DesignPage')) : null;

const devRoutes: RouteObject[] = DesignPage
  ? [
      {
        path: 'design',
        element: (
          <Suspense
            fallback={
              <div className="eh-container flex justify-center py-24 text-fg-muted">
                <Spinner size="lg" label="Loading design system" />
              </div>
            }
          >
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
      ...devRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
