import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addCartItem, fetchCart, removeCartItem, updateCartItem } from './cart';
import { fetchCategories, fetchFeaturedProducts, fetchProduct, fetchProducts } from './catalog';
import { ApiError } from './http';
import type { Cart, ProductQuery } from './types';

/** Query keys in one place so invalidation stays consistent. */
export const queryKeys = {
  categories: ['categories'] as const,
  products: (query: ProductQuery) => ['products', query] as const,
  featured: (limit: number) => ['products', 'featured', limit] as const,
  product: (id: string) => ['product', id] as const,
  cart: ['cart'] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: 5 * 60_000,
  });
}

export function useProducts(query: ProductQuery) {
  return useQuery({
    queryKey: queryKeys.products(query),
    queryFn: ({ signal }) => fetchProducts(query, signal),
    placeholderData: keepPreviousData, // keep the grid while the next page/sort loads
  });
}

export function useFeaturedProducts(limit = 8) {
  return useQuery({
    queryKey: queryKeys.featured(limit),
    queryFn: ({ signal }) => fetchFeaturedProducts(limit, signal),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: ({ signal }) => fetchProduct(id, signal),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  });
}

export function useCart() {
  return useQuery({ queryKey: queryKeys.cart, queryFn: ({ signal }) => fetchCart(signal) });
}

/**
 * Cart mutations write the server's response straight into the cache, so the
 * badge, drawer and pages update without a refetch. Stock changes elsewhere
 * are picked up by invalidating product queries.
 */
export interface CartMutationCallbacks<TVars> {
  onSuccess?: (cart: Cart, vars: TVars) => void;
  onError?: (error: Error, vars: TVars) => void;
}

/**
 * Feedback (toasts) goes through these hook-level callbacks rather than
 * `mutate(vars, { onSuccess })`: per-call callbacks are skipped by TanStack
 * Query when the observer is re-created (e.g. StrictMode remounts), while
 * hook-level callbacks always run.
 */
function useCartMutation<TVars>(
  fn: (vars: TVars) => Promise<Cart>,
  callbacks: CartMutationCallbacks<TVars> = {},
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart, vars) => {
      client.setQueryData(queryKeys.cart, cart);
      callbacks.onSuccess?.(cart, vars);
    },
    onError: (error, vars) => {
      // A 404/409 means our cached view was stale; refresh it.
      if (error instanceof ApiError && [404, 409].includes(error.status)) {
        void client.invalidateQueries({ queryKey: queryKeys.cart });
        void client.invalidateQueries({ queryKey: ['products'] });
        void client.invalidateQueries({ queryKey: ['product'] });
      }
      callbacks.onError?.(error, vars);
    },
  });
}

export interface AddToCartVars {
  productId: string;
  quantity?: number;
  /** Only used for user feedback (toast text); not sent to the API. */
  name?: string;
}

export const useAddToCart = (callbacks?: CartMutationCallbacks<AddToCartVars>) =>
  useCartMutation(
    ({ productId, quantity }: AddToCartVars) => addCartItem(productId, quantity),
    callbacks,
  );

export const useUpdateCartItem = (
  callbacks?: CartMutationCallbacks<{ productId: string; quantity: number }>,
) =>
  useCartMutation(
    ({ productId, quantity }: { productId: string; quantity: number }) =>
      updateCartItem(productId, quantity),
    callbacks,
  );

export const useRemoveCartItem = (callbacks?: CartMutationCallbacks<{ productId: string }>) =>
  useCartMutation(({ productId }: { productId: string }) => removeCartItem(productId), callbacks);
