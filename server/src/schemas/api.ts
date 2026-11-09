/**
 * Zod schemas for HTTP input (query strings, route params, JSON bodies).
 * Domain schemas (product, customer, order) live next to this file; these
 * adapt them to what arrives over HTTP, where every query value is a string.
 */
import { z } from 'zod';
import { idSchema } from './common.js';
import { addressSchema } from './customer.js';
import { orderStatusSchema } from './order.js';
import {
  categorySchema,
  productInputSchema,
  productUpdateSchema,
  PRODUCT_SORTS,
} from './product.js';

/** "true"/"false"/"1"/"0" → boolean. */
const queryBoolean = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const cents = z.coerce.number().int().min(0);

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

export const productListQuery = paginationQuery
  .extend({
    category: categorySchema.optional(),
    brand: z.string().trim().min(1).max(80).optional(),
    minPriceCents: cents.optional(),
    maxPriceCents: cents.optional(),
    inStock: queryBoolean.optional(),
    featured: queryBoolean.optional(),
    sort: z.enum(PRODUCT_SORTS).default('newest'),
  })
  .refine(
    (q) =>
      q.minPriceCents === undefined ||
      q.maxPriceCents === undefined ||
      q.minPriceCents <= q.maxPriceCents,
    {
      message: 'minPriceCents must be less than or equal to maxPriceCents',
      path: ['minPriceCents'],
    },
  );
export type ProductListQuery = z.infer<typeof productListQuery>;

export const productIdParams = z.object({ id: idSchema });
export const categoryParams = z.object({ category: z.string().min(1).max(64) });
export const cartItemParams = z.object({ productId: idSchema });
export const orderIdParams = z.object({ id: z.string().regex(/^ord_\d{6,}$/, 'Invalid order id') });

export const featuredQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(8),
});

// ── Cart ──────────────────────────────────────────────────────────────────
export const addCartItemBody = z.object({
  productId: idSchema,
  quantity: z.number().int().min(1).max(99).default(1),
});

export const updateCartItemBody = z.object({
  quantity: z.number().int().min(0).max(99),
});

// ── Checkout ──────────────────────────────────────────────────────────────
export const checkoutBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30).optional(),
  shippingAddress: addressSchema,
});
export type CheckoutBody = z.infer<typeof checkoutBody>;

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminLoginBody = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
});

/** `id` is optional: a URL slug is generated from the name when omitted. */
export const adminCreateProductBody = productInputSchema
  .omit({ createdAt: true })
  .extend({ id: idSchema.optional() });
export type AdminCreateProductBody = z.infer<typeof adminCreateProductBody>;

/** Partial update; `stock` sets an absolute stock level through the inventory. */
export const adminUpdateProductBody = productUpdateSchema
  .extend({ stock: z.number().int().min(0).optional() })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  });
export type AdminUpdateProductBody = z.infer<typeof adminUpdateProductBody>;

export const adminOrdersQuery = paginationQuery.extend({
  status: orderStatusSchema.optional(),
});

export const updateOrderStatusBody = z.object({ status: orderStatusSchema });

export const lowStockQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
