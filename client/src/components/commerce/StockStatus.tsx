import { Badge, type BadgeProps } from '@/components/ui';

/** Stock at or below this shows "Only N left". Mirrors LOW_STOCK_THRESHOLD on the server. */
export const LOW_STOCK_THRESHOLD = 5;

export function stockState(stock: number): 'out' | 'low' | 'in' {
  if (stock <= 0) return 'out';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low';
  return 'in';
}

/** Stock badge. The text carries the meaning (not just the colour). */
export function StockBadge({
  stock,
  size = 'sm',
  showInStock = false,
}: {
  stock: number;
  size?: BadgeProps['size'];
  showInStock?: boolean;
}) {
  const state = stockState(stock);
  if (state === 'out')
    return (
      <Badge variant="danger" size={size} dot>
        Out of stock
      </Badge>
    );
  if (state === 'low')
    return (
      <Badge variant="warning" size={size} dot>
        Only {stock} left
      </Badge>
    );
  return showInStock ? (
    <Badge variant="success" size={size} dot>
      In stock
    </Badge>
  ) : null;
}
