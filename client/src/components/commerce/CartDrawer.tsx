import { Link } from 'react-router';
import { ShoppingBag, Trash2, TriangleAlert, Truck } from 'lucide-react';
import { ApiError } from '@/api/http';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/api/queries';
import type { CartLine } from '@/api/types';
import {
  Button,
  ButtonLink,
  Drawer,
  EmptyState,
  QuantityStepper,
  Skeleton,
  SkeletonGroup,
  useToast,
} from '@/components/ui';
import { formatPrice, plural } from '@/lib/format';
import { useCartUi } from '@/store/cartUi';
import { Price } from './Price';
import { ProductImage } from './ProductImage';

/** Mirrors FREE_SHIPPING_THRESHOLD_CENTS on the server (default $100). */
const FREE_SHIPPING_CENTS = 10000;

/** Slide-over cart: lines with quantity steppers, totals, free-shipping progress. */
export function CartDrawer() {
  const { isOpen, close } = useCartUi();
  const cart = useCart();
  const items = cart.data?.items ?? [];

  const footer =
    cart.data && items.length > 0 ? (
      <div className="flex flex-col gap-4">
        <FreeShippingProgress subtotal={cart.data.subtotalCents} />
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-fg-secondary">
            <dt>Subtotal</dt>
            <dd className="eh-numeric">{formatPrice(cart.data.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between text-fg-secondary">
            <dt>Shipping</dt>
            <dd className="eh-numeric">
              {cart.data.shippingCents === 0 ? 'Free' : formatPrice(cart.data.shippingCents)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-3 text-base font-semibold text-fg">
            <dt>Total</dt>
            <dd>
              <Price cents={cart.data.totalCents} size="lg" />
            </dd>
          </div>
        </dl>
        <Button variant="secondary" fullWidth onClick={close}>
          Continue shopping
        </Button>
      </div>
    ) : undefined;

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title="Your cart"
      description={cart.data ? plural(cart.data.itemCount, 'item') : undefined}
      footer={footer}
    >
      {cart.isPending ? (
        <SkeletonGroup label="Loading cart" className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-20 shrink-0" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton shape="text" lines={2} />
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
          ))}
        </SkeletonGroup>
      ) : cart.isError ? (
        <EmptyState
          size="sm"
          icon={<TriangleAlert />}
          title="We couldn't load your cart"
          description="Check your connection and try again."
          actions={
            <Button size="sm" onClick={() => void cart.refetch()}>
              Retry
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<ShoppingBag />}
          title="Your cart is empty"
          description="Find something you'll love: laptops, monitors, audio and more."
          actions={
            <ButtonLink to="/products" onClick={close} size="sm">
              Browse products
            </ButtonLink>
          }
        />
      ) : (
        <>
          {cart.data?.hasStockIssues && (
            <p
              role="alert"
              className="mb-4 flex gap-2 rounded-md bg-warning-soft p-3 text-sm text-warning"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Some items have less stock than you've selected. Lower the quantity to continue.
            </p>
          )}
          <ul className="flex flex-col divide-y divide-border">
            {items.map((line) => (
              <CartLineRow key={line.productId} line={line} onNavigate={close} />
            ))}
          </ul>
        </>
      )}
    </Drawer>
  );
}

function CartLineRow({ line, onNavigate }: { line: CartLine; onNavigate: () => void }) {
  const toast = useToast();
  const onError = (error: Error) =>
    toast.error("Couldn't update your cart", error instanceof ApiError ? error.message : undefined);
  const update = useUpdateCartItem({ onError });
  const remove = useRemoveCartItem({
    onError,
    onSuccess: () => toast.toast({ title: 'Removed from cart', description: line.name }),
  });

  return (
    <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
      <Link
        to={`/products/${line.productId}`}
        onClick={onNavigate}
        tabIndex={-1}
        aria-hidden
        className="shrink-0"
      >
        <ProductImage
          product={line}
          aspect="aspect-square"
          className="size-20 rounded-md border border-border"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-fg-muted">{line.brand}</p>
            <Link
              to={`/products/${line.productId}`}
              onClick={onNavigate}
              className="line-clamp-2 text-sm font-medium text-fg hover:text-accent-text"
            >
              {line.name}
            </Link>
          </div>
          <Price cents={line.lineTotalCents} size="sm" className="shrink-0" />
        </div>
        {line.exceedsStock && <p className="text-xs text-warning">Only {line.stock} in stock</p>}
        <div className="flex items-center justify-between gap-2">
          <QuantityStepper
            size="sm"
            value={line.quantity}
            min={1}
            max={Math.max(line.stock, line.quantity, 1)}
            loading={update.isPending}
            label={`Quantity for ${line.name}`}
            onChange={(quantity) => update.mutate({ productId: line.productId, quantity })}
          />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={`Remove ${line.name} from cart`}
            loading={remove.isPending}
            onClick={() => remove.mutate({ productId: line.productId })}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </li>
  );
}

function FreeShippingProgress({ subtotal }: { subtotal: number }) {
  const remaining = Math.max(0, FREE_SHIPPING_CENTS - subtotal);
  const percent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_CENTS) * 100));
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-sm text-fg-secondary">
        <Truck className="size-4 text-accent-text" aria-hidden />
        {remaining === 0 ? (
          <span>You've unlocked free shipping.</span>
        ) : (
          <span>
            Add <span className="eh-numeric text-fg">{formatPrice(remaining)}</span> for free
            shipping.
          </span>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Progress to free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-sunken"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-slow ease-standard"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
