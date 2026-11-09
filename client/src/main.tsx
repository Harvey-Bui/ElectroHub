import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import { App } from './App';
import { adminKeys } from './api/adminQueries';
import { ApiError } from './api/http';
import { ToastProvider } from './components/ui';
import { CartUiProvider } from './store/cartUi';
import { ThemeProvider } from './store/theme';
import './styles/index.css';

/**
 * An admin request answered 401 means the session expired or was revoked.
 * Mark the cached session as gone; AdminLayout reacts by sending the user to
 * the login page (and back here after signing in).
 */
const onAdminUnauthorized = (error: unknown, isAdminRequest: boolean) => {
  if (isAdminRequest && error instanceof ApiError && error.status === 401) {
    void queryClient.invalidateQueries({ queryKey: adminKeys.session });
  }
};

const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) =>
      onAdminUnauthorized(error, query.queryKey[0] === 'admin' && query.queryKey[1] !== 'session'),
  }),
  mutationCache: new MutationCache({
    // Login itself legitimately answers 401 for a wrong password.
    onError: (error) =>
      onAdminUnauthorized(
        error,
        window.location.pathname.startsWith('/admin/') &&
          !window.location.pathname.startsWith('/admin/login'),
      ),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry client errors (404, 400); retry network/5xx once.
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
    },
  },
});

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <CartUiProvider>
            <App />
          </CartUiProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
