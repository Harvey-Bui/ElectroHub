import { apiRequest } from './http';
import type { Cart } from './types';

type CartResponse = { data: Cart };

export function fetchCart(signal?: AbortSignal) {
  return apiRequest<CartResponse>('/api/cart', { signal }).then((r) => r.data);
}

export function addCartItem(productId: string, quantity = 1) {
  return apiRequest<CartResponse>('/api/cart/items', {
    method: 'POST',
    body: { productId, quantity },
  }).then((r) => r.data);
}

export function updateCartItem(productId: string, quantity: number) {
  return apiRequest<CartResponse>(`/api/cart/items/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    body: { quantity },
  }).then((r) => r.data);
}

export function removeCartItem(productId: string) {
  return apiRequest<CartResponse>(`/api/cart/items/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  }).then((r) => r.data);
}
