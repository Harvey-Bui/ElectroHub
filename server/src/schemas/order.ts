import { z } from 'zod';
import { addressSchema } from './customer.js';
import { idSchema } from './common.js';

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

/** Allowed status transitions. Terminal states have no outgoing transitions. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

/** Statuses from which a customer may still cancel. */
export const CUSTOMER_CANCELLABLE: readonly OrderStatus[] = ['pending', 'paid'];

/** Line item captured at checkout. Name and price are snapshotted so later catalogue edits don't change history. */
export const orderItemSchema = z.object({
  productId: idSchema,
  name: z.string().min(1),
  unitPriceCents: z.number().int().min(0),
  quantity: z.number().int().min(1),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

/** Who to contact about the order, captured at checkout. */
export const orderContactSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30).optional(),
});
export type OrderContact = z.infer<typeof orderContactSchema>;

export const orderInputSchema = z.object({
  customerId: idSchema,
  items: z.array(orderItemSchema).min(1),
  shippingAddress: addressSchema,
  shippingCents: z.number().int().min(0).default(0),
  contact: orderContactSchema.optional(),
});
export type OrderInput = z.input<typeof orderInputSchema>;

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  itemCount: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shippingAddress: z.infer<typeof addressSchema>;
  contact: OrderContact | null;
  createdAt: string;
  updatedAt: string;
}
