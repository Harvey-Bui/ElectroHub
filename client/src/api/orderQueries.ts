import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from './http';
import { cancelMyOrder, checkout, fetchMyOrder, fetchMyOrders } from './orders';
import { queryKeys } from './queries';
import type { CheckoutInput, Order } from './types';

export const orderKeys = {
  list: (page: number) => ['orders', 'mine', page] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
};

export function useMyOrders(page: number, limit = 10) {
  return useQuery({
    queryKey: orderKeys.list(page),
    queryFn: ({ signal }) => fetchMyOrders(page, limit, signal),
    placeholderData: keepPreviousData,
  });
}

export function useMyOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: ({ signal }) => fetchMyOrder(id, signal),
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
  });
}

interface Callbacks<TVars> {
  onSuccess?: (order: Order, vars: TVars) => void;
  onError?: (error: Error, vars: TVars) => void;
}

/** Stock and the cart change on checkout and cancellation, so both refresh catalogue data. */
function useInvalidateStoreData() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: ['products'] });
    void client.invalidateQueries({ queryKey: ['product'] });
    void client.invalidateQueries({ queryKey: ['orders', 'mine'] });
  };
}

export function useCheckout(callbacks: Callbacks<CheckoutInput> = {}) {
  const client = useQueryClient();
  const refresh = useInvalidateStoreData();
  return useMutation({
    mutationFn: checkout,
    onSuccess: (order, vars) => {
      client.setQueryData(orderKeys.detail(order.id), order);
      void client.invalidateQueries({ queryKey: queryKeys.cart }); // server emptied it
      refresh();
      callbacks.onSuccess?.(order, vars);
    },
    onError: (error, vars) => {
      // Stock or the cart changed under us: show the shopper the current state.
      if (error instanceof ApiError && error.status === 409) {
        void client.invalidateQueries({ queryKey: queryKeys.cart });
      }
      callbacks.onError?.(error, vars);
    },
  });
}

export function useCancelOrder(callbacks: Callbacks<string> = {}) {
  const client = useQueryClient();
  const refresh = useInvalidateStoreData();
  return useMutation({
    mutationFn: cancelMyOrder,
    onSuccess: (order, id) => {
      client.setQueryData(orderKeys.detail(order.id), order);
      refresh();
      callbacks.onSuccess?.(order, id);
    },
    onError: (error, id) => {
      void client.invalidateQueries({ queryKey: orderKeys.detail(id) });
      callbacks.onError?.(error, id);
    },
  });
}
