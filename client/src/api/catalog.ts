import { apiRequest } from './http';
import type { Category, Page, Product, ProductQuery } from './types';

/** Builds a query string, skipping undefined/empty values. */
export function toQueryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function fetchCategories(signal?: AbortSignal) {
  return apiRequest<{ data: Category[] }>('/api/categories', { signal }).then((r) => r.data);
}

export function fetchProducts(query: ProductQuery, signal?: AbortSignal) {
  return apiRequest<Page<Product>>(`/api/products${toQueryString(query)}`, { signal });
}

export function fetchFeaturedProducts(limit = 8, signal?: AbortSignal) {
  return apiRequest<{ data: Product[] }>(`/api/products/featured?limit=${limit}`, { signal }).then(
    (r) => r.data,
  );
}

export function fetchProduct(id: string, signal?: AbortSignal) {
  return apiRequest<{ data: Product }>(`/api/products/${encodeURIComponent(id)}`, { signal }).then(
    (r) => r.data,
  );
}
