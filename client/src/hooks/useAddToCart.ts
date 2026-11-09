import { ApiError } from '@/api/http';
import { useAddToCart } from '@/api/queries';
import { useToast } from '@/components/ui';
import { useCartUi } from '@/store/cartUi';

/**
 * "Add to cart" with user feedback: success toast with a "View cart" action,
 * or an error toast with the server's message (e.g. "Only 2 unit(s) in stock").
 */
export function useAddToCartWithFeedback() {
  const toast = useToast();
  const cartUi = useCartUi();
  const mutation = useAddToCart({
    onSuccess: (_cart, { name, quantity = 1 }) =>
      toast.toast({
        variant: 'success',
        title: 'Added to cart',
        description: quantity > 1 ? `${quantity} × ${name}` : name,
        action: { label: 'View cart', onClick: cartUi.open },
      }),
    onError: (error) =>
      toast.error(
        "Couldn't add to cart",
        error instanceof ApiError ? error.message : 'Please try again.',
      ),
  });

  const add = (product: { id: string; name: string }, quantity = 1) =>
    mutation.mutate({ productId: product.id, quantity, name: product.name });

  /** The product currently being added, for per-card loading states. */
  const pendingId = mutation.isPending ? mutation.variables?.productId : undefined;
  return { add, pendingId };
}
