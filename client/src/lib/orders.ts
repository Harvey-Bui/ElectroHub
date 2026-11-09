import type { OrderStatus } from '@/api/types';
import type { BadgeVariant } from '@/components/ui';

/** Mirrors ORDER_TRANSITIONS on the server. The server re-checks every change. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

/** Statuses a shopper may still cancel from. */
export const CUSTOMER_CANCELLABLE: readonly OrderStatus[] = ['pending', 'paid'];

/** The happy-path sequence shown as a progress tracker. */
export const ORDER_FLOW: readonly OrderStatus[] = ['pending', 'paid', 'shipped', 'delivered'];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; badge: BadgeVariant; description: string; action?: string }
> = {
  pending: {
    label: 'Pending',
    badge: 'warning',
    description: 'Order received. Waiting for payment confirmation.',
  },
  paid: {
    label: 'Paid',
    badge: 'accent',
    description: 'Payment confirmed. Preparing your items.',
    action: 'Mark as paid',
  },
  shipped: {
    label: 'Shipped',
    badge: 'accent',
    description: 'On its way to you.',
    action: 'Mark as shipped',
  },
  delivered: {
    label: 'Delivered',
    badge: 'success',
    description: 'Delivered. Enjoy your new gear.',
    action: 'Mark as delivered',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'danger',
    description: 'Cancelled. Items were returned to stock.',
    action: 'Cancel order',
  },
};

const dateTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatDate = (iso: string) => dateOnly.format(new Date(iso));

/** Countries offered at checkout (ISO 3166-1 alpha-2). */
export const COUNTRIES = [
  { value: 'VN', label: 'Vietnam' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'SG', label: 'Singapore' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
] as const;

export const countryName = (code: string) => COUNTRIES.find((c) => c.value === code)?.label ?? code;
