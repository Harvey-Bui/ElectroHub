import { toQueryString } from './catalog';
import { apiRequest } from './http';
import type { CheckoutInput, Order, Page } from './types';

type OrderResponse = { data: Order };

export function checkout(input: CheckoutInput) {
  return apiRequest<OrderResponse>('/api/checkout', { method: 'POST', body: input }).then(
    (r) => r.data,
  );
}

export function fetchMyOrders(page: number, limit: number, signal?: AbortSignal) {
  return apiRequest<Page<Order>>(`/api/orders${toQueryString({ page, limit })}`, { signal });
}

export function fetchMyOrder(id: string, signal?: AbortSignal) {
  return apiRequest<OrderResponse>(`/api/orders/${encodeURIComponent(id)}`, { signal }).then(
    (r) => r.data,
  );
}

export function cancelMyOrder(id: string) {
  return apiRequest<OrderResponse>(`/api/orders/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  }).then((r) => r.data);
}
