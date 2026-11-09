import { useState } from 'react';
import { useParams } from 'react-router';
import { ArrowLeft, Ban, PackageX, TriangleAlert } from 'lucide-react';
import { useAdminOrder, useUpdateOrderStatus } from '@/api/adminQueries';
import { ApiError, errorMessage } from '@/api/http';
import type { OrderStatus } from '@/api/types';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { OrderDetails } from '@/components/commerce/OrderDetails';
import {
  Button,
  ButtonLink,
  EmptyState,
  Modal,
  Skeleton,
  SkeletonGroup,
  useToast,
} from '@/components/ui';
import { ORDER_STATUS_META, ORDER_TRANSITIONS } from '@/lib/orders';

export function AdminOrderPage() {
  const { id = '' } = useParams();
  const order = useAdminOrder(id);
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const update = useUpdateOrderStatus({
    onSuccess: (o, { status }) => {
      setConfirmCancel(false);
      toast.success(
        `Order ${o.id} is now ${ORDER_STATUS_META[status].label.toLowerCase()}`,
        status === 'cancelled' ? 'Items were returned to stock.' : undefined,
      );
    },
    onError: (error) => {
      setConfirmCancel(false);
      toast.error("Couldn't update the order", errorMessage(error));
    },
  });

  const back = (
    <ButtonLink to="/admin/orders" variant="ghost" size="sm" leftIcon={<ArrowLeft />}>
      All orders
    </ButtonLink>
  );

  if (order.isPending) {
    return (
      <SkeletonGroup label="Loading order" className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </SkeletonGroup>
    );
  }

  if (order.isError) {
    const notFound = order.error instanceof ApiError && [400, 404].includes(order.error.status);
    return (
      <EmptyState
        headingLevel="h2"
        icon={notFound ? <PackageX /> : <TriangleAlert />}
        title={notFound ? `Order ${id} not found` : "We couldn't load this order"}
        description={notFound ? undefined : errorMessage(order.error)}
        actions={back}
      />
    );
  }

  const o = order.data;
  const next = ORDER_TRANSITIONS[o.status];
  const forward = next.filter((s) => s !== 'cancelled');
  const pending = update.isPending ? update.variables?.status : undefined;
  const move = (status: OrderStatus) => update.mutate({ id: o.id, status });

  return (
    <>
      <AdminPageHeader
        eyebrow="Order"
        title={<span className="eh-numeric">{o.id}</span>}
        description={
          <>
            Customer <span className="eh-numeric">{o.customerId}</span>
          </>
        }
        actions={back}
      />
      <OrderDetails
        order={o}
        actions={
          next.length > 0 ? (
            <>
              {forward.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  loading={pending === s}
                  disabled={update.isPending}
                  onClick={() => move(s)}
                >
                  {ORDER_STATUS_META[s].action}
                </Button>
              ))}
              {next.includes('cancelled') && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Ban />}
                  disabled={update.isPending}
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancel order
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-fg-muted">
              No further changes: this order is {ORDER_STATUS_META[o.status].label.toLowerCase()}.
            </p>
          )
        }
      />
      <Modal
        open={confirmCancel}
        onClose={() => !update.isPending && setConfirmCancel(false)}
        role="alertdialog"
        size="sm"
        closeOnBackdrop={false}
        title={`Cancel order ${o.id}?`}
        description={`${o.itemCount} item${o.itemCount === 1 ? '' : 's'} will be returned to stock and the revenue reversed. This can't be undone.`}
        footer={
          <>
            <Button
              variant="secondary"
              data-autofocus
              disabled={update.isPending}
              onClick={() => setConfirmCancel(false)}
            >
              Keep order
            </Button>
            <Button
              variant="danger"
              loading={pending === 'cancelled'}
              loadingText="Cancelling"
              onClick={() => move('cancelled')}
            >
              Cancel order
            </Button>
          </>
        }
      />
    </>
  );
}
