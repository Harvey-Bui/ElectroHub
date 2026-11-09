import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminLogin,
  adminLogout,
  createProduct,
  deleteProduct,
  fetchAdminOrder,
  fetchAdminOrders,
  fetchAdminSession,
  fetchDashboard,
  fetchLowStock,
  updateOrderStatus,
  updateProduct,
} from './admin';
import type {
  AdminSession,
  Order,
  OrderStatus,
  Product,
  ProductInput,
  ProductUpdate,
} from './types';

/**
 * Every admin query key starts with 'admin'. A 401 from any of them (expired
 * session) is caught globally in main.tsx, which refetches the session; the
 * AdminLayout guard then redirects to the login page.
 */
export const adminKeys = {
  all: ['admin'] as const,
  session: ['admin', 'session'] as const,
  dashboard: ['admin', 'dashboard'] as const,
  orders: (query: object) => ['admin', 'orders', query] as const,
  order: (id: string) => ['admin', 'order', id] as const,
  lowStock: ['admin', 'low-stock'] as const,
};

export function useAdminSession() {
  return useQuery({
    queryKey: adminKeys.session,
    queryFn: ({ signal }) => fetchAdminSession(signal),
    retry: false,
    staleTime: 60_000,
  });
}

// Callbacks are passed to the hooks rather than to mutate(): hook-level
// callbacks always run, per-call ones can be skipped (see queries.ts).

export function useAdminLogin(
  callbacks: { onSuccess?: (session: AdminSession) => void; onError?: (error: Error) => void } = {},
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      adminLogin(username, password),
    onSuccess: (session) => {
      client.setQueryData(adminKeys.session, session);
      callbacks.onSuccess?.(session);
    },
    onError: (error) => callbacks.onError?.(error),
  });
}

export function useAdminLogout(callbacks: { onSettled?: () => void } = {}) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: adminLogout,
    // Forget everything admin-only, whether or not the request succeeded.
    onSettled: () => {
      client.removeQueries({ queryKey: adminKeys.all });
      callbacks.onSettled?.();
    },
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: adminKeys.dashboard,
    queryFn: ({ signal }) => fetchDashboard(signal),
    refetchInterval: 30_000, // live-ish overview while the tab is open
  });
}

export function useAdminOrders(query: { status?: OrderStatus; page: number; limit: number }) {
  return useQuery({
    queryKey: adminKeys.orders(query),
    queryFn: ({ signal }) => fetchAdminOrders(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: adminKeys.order(id),
    queryFn: ({ signal }) => fetchAdminOrder(id, signal),
  });
}

export function useLowStock(limit = 50) {
  return useQuery({
    queryKey: [...adminKeys.lowStock, limit],
    queryFn: ({ signal }) => fetchLowStock(limit, signal),
  });
}

interface Callbacks<TData, TVars> {
  onSuccess?: (data: TData, vars: TVars) => void;
  onError?: (error: Error, vars: TVars) => void;
}

/** Refreshes everything an admin write can affect (catalogue, stock, orders, dashboard). */
function useRefreshAfterWrite() {
  const client = useQueryClient();
  return () => {
    for (const key of [['products'], ['product'], ['categories'], adminKeys.all]) {
      void client.invalidateQueries({ queryKey: key });
    }
  };
}

export function useUpdateOrderStatus(
  callbacks: Callbacks<Order, { id: string; status: OrderStatus }> = {},
) {
  const client = useQueryClient();
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: (order, vars) => {
      client.setQueryData(adminKeys.order(order.id), order);
      refresh();
      callbacks.onSuccess?.(order, vars);
    },
    onError: (error, vars) => {
      void client.invalidateQueries({ queryKey: adminKeys.order(vars.id) });
      callbacks.onError?.(error, vars);
    },
  });
}

export function useCreateProduct(callbacks: Callbacks<Product, ProductInput> = {}) {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: (product, vars) => {
      refresh();
      callbacks.onSuccess?.(product, vars);
    },
    onError: callbacks.onError,
  });
}

export function useUpdateProduct(
  callbacks: Callbacks<Product, { id: string; input: ProductUpdate }> = {},
) {
  const client = useQueryClient();
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductUpdate }) => updateProduct(id, input),
    onSuccess: (product, vars) => {
      client.setQueryData(['product', product.id], product);
      refresh();
      callbacks.onSuccess?.(product, vars);
    },
    onError: callbacks.onError,
  });
}

export function useDeleteProduct(callbacks: Callbacks<void, string> = {}) {
  const client = useQueryClient();
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_data, id) => {
      client.removeQueries({ queryKey: ['product', id] });
      refresh();
      callbacks.onSuccess?.(undefined, id);
    },
    onError: callbacks.onError,
  });
}
