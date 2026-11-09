import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Lock, PackageCheck, ShoppingBag, TriangleAlert } from 'lucide-react';
import { ApiError, errorMessage } from '@/api/http';
import { useCheckout } from '@/api/orderQueries';
import { useCart } from '@/api/queries';
import type { CheckoutInput } from '@/api/types';
import { OrderSummary } from '@/components/commerce/OrderSummary';
import { ProductImage } from '@/components/commerce/ProductImage';
import {
  Breadcrumbs,
  Button,
  ButtonLink,
  EmptyState,
  Input,
  Select,
  Skeleton,
  SkeletonGroup,
  useToast,
} from '@/components/ui';
import { formatPrice } from '@/lib/format';
import { COUNTRIES } from '@/lib/orders';
import {
  cleanCheckout,
  showErrorsAndFocus,
  validateCheckout,
  type FieldErrors,
} from '@/lib/validation';
import { useCartUi } from '@/store/cartUi';

const EMPTY: CheckoutInput = {
  email: '',
  name: '',
  phone: '',
  shippingAddress: { line1: '', line2: '', city: '', region: '', postalCode: '', country: '' },
};

export function CheckoutPage() {
  const cart = useCart();
  const cartUi = useCartUi();
  const navigate = useNavigate();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<CheckoutInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<string | null>(null);

  const placeOrder = useCheckout({
    onSuccess: (order) => {
      toast.success('Order placed', `Order ${order.id} is confirmed.`);
      navigate(`/orders/${order.id}?placed=1`, { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
        showErrorsAndFocus(setErrors, error.fieldErrors, formRef.current);
        return;
      }
      // Stock changed, a product was removed, or the cart was emptied elsewhere.
      setProblem(errorMessage(error));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const set = (path: string, value: string) => {
    setForm((f) =>
      path.startsWith('shippingAddress.')
        ? { ...f, shippingAddress: { ...f.shippingAddress, [path.slice(16)]: value } }
        : { ...f, [path]: value },
    );
    if (errors[path]) setErrors(({ [path]: _removed, ...rest }) => rest);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setProblem(null);
    const found = validateCheckout(form);
    if (Object.keys(found).length > 0) {
      showErrorsAndFocus(setErrors, found, formRef.current);
      return;
    }
    setErrors({});
    placeOrder.mutate(cleanCheckout(form));
  };

  /** Props shared by every text field: value, change handler, error. */
  const field = (path: string) => ({
    name: path,
    value: path.startsWith('shippingAddress.')
      ? (form.shippingAddress[path.slice(16) as keyof CheckoutInput['shippingAddress']] ?? '')
      : String(form[path as keyof CheckoutInput] ?? ''),
    onChange: (e: { target: { value: string } }) => set(path, e.target.value),
    error: errors[path],
  });

  if (cart.isPending) {
    return (
      <SkeletonGroup
        label="Loading checkout"
        className="eh-container grid gap-8 py-10 lg:grid-cols-[1fr_24rem]"
      >
        <Skeleton className="h-[32rem] rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </SkeletonGroup>
    );
  }

  if (cart.isError || !cart.data || cart.data.items.length === 0) {
    return (
      <div className="eh-container py-16">
        <EmptyState
          icon={<ShoppingBag />}
          title={cart.isError ? "We couldn't load your cart" : 'Your cart is empty'}
          description={
            cart.isError
              ? errorMessage(cart.error)
              : 'Add something to your cart before checking out.'
          }
          actions={<ButtonLink to="/products">Browse products</ButtonLink>}
        />
        <h1 className="sr-only">Checkout</h1>
      </div>
    );
  }

  const c = cart.data;
  return (
    <div className="eh-container py-8 md:py-12">
      <Breadcrumbs items={[{ label: 'Cart' }, { label: 'Checkout' }]} className="mb-6" />
      <h1 className="mb-8 text-3xl font-semibold text-fg md:text-4xl">Checkout</h1>

      {(problem || c.hasStockIssues) && (
        <div
          role="alert"
          className="mb-8 flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2 text-sm text-fg">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <span>
              {problem ?? 'Some items in your cart have less stock than you selected.'} Review your
              cart, then place the order again.
            </span>
          </p>
          <Button variant="secondary" size="sm" onClick={cartUi.open} className="shrink-0">
            Review cart
          </Button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:gap-12">
        <form
          ref={formRef}
          noValidate
          onSubmit={submit}
          aria-label="Checkout"
          className="flex flex-col gap-8"
        >
          <fieldset
            aria-labelledby="checkout-contact"
            className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 md:p-6"
          >
            <h2 id="checkout-contact" className="text-lg font-semibold text-fg">
              Contact
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                hint="We'll send order updates here."
                wrapperClassName="sm:col-span-2"
                {...field('email')}
              />
              <Input label="Full name" required autoComplete="name" {...field('name')} />
              <Input
                label="Phone"
                type="tel"
                autoComplete="tel"
                hint="Optional, for the courier."
                {...field('phone')}
              />
            </div>
          </fieldset>

          <fieldset
            aria-labelledby="checkout-shipping"
            className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 md:p-6"
          >
            <h2 id="checkout-shipping" className="text-lg font-semibold text-fg">
              Shipping address
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Street address"
                required
                autoComplete="address-line1"
                wrapperClassName="sm:col-span-2"
                {...field('shippingAddress.line1')}
              />
              <Input
                label="Apartment, suite, floor"
                autoComplete="address-line2"
                hint="Optional"
                wrapperClassName="sm:col-span-2"
                {...field('shippingAddress.line2')}
              />
              <Input
                label="City"
                required
                autoComplete="address-level2"
                {...field('shippingAddress.city')}
              />
              <Input
                label="State / province"
                autoComplete="address-level1"
                hint="Optional"
                {...field('shippingAddress.region')}
              />
              <Input
                label="Postal code"
                required
                autoComplete="postal-code"
                {...field('shippingAddress.postalCode')}
              />
              <Select
                label="Country"
                required
                autoComplete="country"
                placeholder="Select a country"
                options={[...COUNTRIES]}
                {...field('shippingAddress.country')}
              />
            </div>
          </fieldset>

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={placeOrder.isPending}
              loadingText="Placing your order"
              disabled={c.hasStockIssues}
              leftIcon={<Lock />}
            >
              Place order · {formatPrice(c.totalCents)}
            </Button>
            <p className="flex items-start gap-2 text-xs text-fg-muted">
              <PackageCheck className="mt-px size-4 shrink-0" aria-hidden />
              Stock is reserved the moment you place the order. This demo store takes no payment:
              new orders start as “Pending” and you can cancel them until they ship.
            </p>
          </div>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary
            lines={c.items.map((line) => ({
              key: line.productId,
              name: line.name,
              quantity: line.quantity,
              unitPriceCents: line.unitPriceCents,
              lineTotalCents: line.lineTotalCents,
              media: (
                <ProductImage
                  product={line}
                  aspect="aspect-square"
                  className="size-14 shrink-0 rounded-md border border-border"
                />
              ),
              note: line.exceedsStock ? (
                <p className="text-xs text-warning">Only {line.stock} in stock</p>
              ) : undefined,
            }))}
            subtotalCents={c.subtotalCents}
            shippingCents={c.shippingCents}
            totalCents={c.totalCents}
            footer={
              <Button variant="ghost" size="sm" onClick={cartUi.open} className="self-start">
                Edit cart
              </Button>
            }
          />
        </aside>
      </div>
    </div>
  );
}
