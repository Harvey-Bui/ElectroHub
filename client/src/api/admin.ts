import { toQueryString } from './catalog';
import { apiRequest } from './http';
import type {
  AdminSession,
  Dashboard,
  LowStockEntry,
  Order,
  OrderStatus,
  Page,
  Product,
  ProductInput,
  ProductUpdate,
} from './types';

/** Admin endpoints. The session is the HTTP-only `eh_admin` cookie (path /api/admin). */

export function adminLogin(username: string, password: string) {
  return apiRequest<{ data: AdminSession }>('/api/admin/login', {
    method: 'POST',
    body: { username, password },
  }).then((r) => r.data);
}

export function adminLogout() {
  return apiRequest<void>('/api/admin/logout', { method: 'POST' });
}

export function fetchAdminSession(signal?: AbortSignal) {
  return apiRequest<{ data: AdminSession }>('/api/admin/me', { signal }).then((r) => r.data);
}

export function fetchDashboard(signal?: AbortSignal) {
  return apiRequest<{ data: Dashboard }>('/api/admin/dashboard', { signal }).then((r) => r.data);
}

export function fetchAdminOrders(
  query: { status?: OrderStatus; page: number; limit: number },
  signal?: AbortSignal,
) {
  return apiRequest<Page<Order>>(`/api/admin/orders${toQueryString(query)}`, { signal });
}

export function fetchAdminOrder(id: string, signal?: AbortSignal) {
  return apiRequest<{ data: Order }>(`/api/admin/orders/${encodeURIComponent(id)}`, {
    signal,
  }).then((r) => r.data);
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  return apiRequest<{ data: Order }>(`/api/admin/orders/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    body: { status },
  }).then((r) => r.data);
}

export function fetchLowStock(limit = 50, signal?: AbortSignal) {
  return apiRequest<{ data: LowStockEntry[] }>(`/api/admin/inventory/low-stock?limit=${limit}`, {
    signal,
  }).then((r) => r.data);
}

export function createProduct(input: ProductInput) {
  return apiRequest<{ data: Product }>('/api/admin/products', { method: 'POST', body: input }).then(
    (r) => r.data,
  );
}

export function updateProduct(id: string, input: ProductUpdate) {
  return apiRequest<{ data: Product }>(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: input,
  }).then((r) => r.data);
}

export function deleteProduct(id: string) {
  return apiRequest<void>(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
