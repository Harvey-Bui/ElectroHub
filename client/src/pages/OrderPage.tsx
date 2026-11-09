import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { ArrowLeft, CircleCheck, PackageX, TriangleAlert } from 'lucide-react';
import { ApiError, errorMessage } from '@/api/http';
import { useCancelOrder, useMyOrder } from '@/api/orderQueries';
import { OrderDetails } from '@/components/commerce/OrderDetails';
import {
  Breadcrumbs,
  Button,
  ButtonLink,
  EmptyState,
  Modal,
  Skeleton,
  SkeletonGroup,
  useToast,
} from '@/components/ui';
import { CUSTOMER_CANCELLABLE } from '@/lib/orders';

/** One order of the current shopper; also the confirmation page after checkout (?placed=1). */
export function OrderPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const justPlaced = params.get('placed') === '1';
  const order = useMyOrder(id);
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  const cancel = useCancelOrder({
    onSuccess: () => {
      setConfirming(false);
      toast.success('Order cancelled', 'Your items were returned to stock.');
    },
    onError: (error) => {
      setConfirming(false);
      toast.error("Couldn't cancel this order", errorMessage(error));
    },
  });

  if (order.isPending) {
    return (
      <SkeletonGroup label="Loading order" className="eh-container flex flex-col gap-6 py-10">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </SkeletonGroup>
    );
  }

  if (order.isError) {
    const notFound = order.error instanceof ApiError && [400, 404].includes(order.error.status);
    return (
      <div className="eh-container py-16">
        <EmptyState
          icon={notFound ? <PackageX /> : <TriangleAlert />}
          title={notFound ? 'Order not found' : "We couldn't load this order"}
          description={
            notFound
              ? 'Orders can only be viewed from the browser they were placed in.'
              : errorMessage(order.error)
          }
          actions={<ButtonLink to="/orders">Your orders</ButtonLink>}
        />
        <h1 className="sr-only">Order</h1>
      </div>
    );
  }

  const o = order.data;
  const cancellable = CUSTOMER_CANCELLABLE.includes(o.status);

  return (
    <div className="eh-container py-8 md:py-12">
      <Breadcrumbs
        items={[{ label: 'Your orders', href: '/orders' }, { label: o.id }]}
        className="mb-6"
      />

      {justPlaced && o.status !== 'cancelled' && (
        <div
          role="status"
          className="mb-8 flex items-start gap-4 rounded-2xl border border-success/30 bg-success-soft p-5 md:p-6"
        >
          <CircleCheck className="mt-0.5 size-7 shrink-0 text-success" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold text-fg">
              Thank you{o.contact ? `, ${o.contact.name.split(' ')[0]}` : ''}! Your order is
              confirmed.
            </p>
            <p className="text-sm text-fg-secondary">
              Your items are reserved.
              {o.contact && (
                <>
                  {' '}
                  We'll send updates to{' '}
                  <span className="font-medium text-fg">{o.contact.email}</span>.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="eh-eyebrow">Order</p>
          <h1 className="eh-numeric text-3xl font-semibold text-fg md:text-4xl">{o.id}</h1>
        </div>
        <ButtonLink to="/orders" variant="ghost" size="sm" leftIcon={<ArrowLeft />}>
          All orders
        </ButtonLink>
      </header>

      <OrderDetails
        order={o}
        actions={
          cancellable && (
            <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
              Cancel order
            </Button>
          )
        }
      />

      <Modal
        open={confirming}
        onClose={() => !cancel.isPending && setConfirming(false)}
        role="alertdialog"
        size="sm"
        closeOnBackdrop={false}
        title={`Cancel order ${o.id}?`}
        description="Your items go back into stock straight away. This can't be undone."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirming(false)}
              disabled={cancel.isPending}
              data-autofocus
            >
              Keep order
            </Button>
            <Button
              variant="danger"
              loading={cancel.isPending}
              loadingText="Cancelling"
              onClick={() => cancel.mutate(o.id)}
            >
              Cancel order
            </Button>
          </>
        }
      />
    </div>
  );
}
