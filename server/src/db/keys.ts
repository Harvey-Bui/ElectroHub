/**
 * Central Redis key schema for ElectroHub. Redis is the system of record.
 *
 * Every key is namespaced with REDIS_KEY_PREFIX (default `electrohub:`), so
 * `product:{id}` is stored as `electrohub:product:{id}`. Repositories must build
 * keys through this module; nothing else in the code base writes key strings.
 *
 * The Lua scripts in `scripts.ts` derive index keys from the same names, so if
 * you rename a key here, rename it in KEY_NAMES below too (the scripts read it).
 *
 * ┌──────────────────────────────┬────────────┬───────────────────────────────────────────┐
 * │ Key                          │ Type       │ Contents                                  │
 * ├──────────────────────────────┼────────────┼───────────────────────────────────────────┤
 * │ product:{id}                 │ Hash       │ product fields, `specs` as JSON           │
 * │ products                     │ Set        │ every product id                          │
 * │ products:category:{slug}     │ Set        │ product ids in a category                 │
 * │ products:brand:{brandSlug}   │ Set        │ product ids of a brand                    │
 * │ products:featured            │ Set        │ featured product ids                      │
 * │ products:by-created          │ Sorted set │ id → created-at (epoch ms)  "newest"      │
 * │ products:by-price            │ Sorted set │ id → price in cents         price sort    │
 * │ products:by-sales            │ Sorted set │ id → units sold             best sellers  │
 * │ inventory                    │ Hash       │ id → units in stock (single source)       │
 * │ inventory:low-stock          │ Sorted set │ id → stock, only stock ≤ threshold        │
 * │ inventory:out-of-stock       │ Set        │ ids with stock = 0                        │
 * │ customer:{id}                │ Hash       │ customer profile                          │
 * │ customer:email:{email}       │ String     │ email → customer id (unique lookup)       │
 * │ customers                    │ Set        │ every customer id                         │
 * │ cart:{customerId}            │ Hash       │ productId → quantity (TTL, sliding)       │
 * │ order:{id}                   │ Hash       │ order header + `items` JSON snapshot      │
 * │ orders                       │ Sorted set │ id → placed-at (epoch ms)                 │
 * │ orders:customer:{customerId} │ Sorted set │ customer order history by time            │
 * │ orders:status:{status}       │ Set        │ order ids currently in that status        │
 * │ counter:order                │ String     │ INCR sequence for order ids               │
 * │ counter:customer             │ String     │ INCR sequence for customer ids            │
 * │ meta:schema-version          │ String     │ data-model version written by db:setup    │
 * └──────────────────────────────┴────────────┴───────────────────────────────────────────┘
 */
export const KEY_NAMES = {
  product: 'product',
  products: 'products',
  productsByCategory: 'products:category',
  productsByBrand: 'products:brand',
  productsFeatured: 'products:featured',
  productsByCreated: 'products:by-created',
  productsByPrice: 'products:by-price',
  productsBySales: 'products:by-sales',
  inventory: 'inventory',
  inventoryLowStock: 'inventory:low-stock',
  inventoryOutOfStock: 'inventory:out-of-stock',
  customer: 'customer',
  customerEmail: 'customer:email',
  customers: 'customers',
  cart: 'cart',
  order: 'order',
  orders: 'orders',
  ordersByCustomer: 'orders:customer',
  ordersByStatus: 'orders:status',
  counterOrder: 'counter:order',
  counterCustomer: 'counter:customer',
  schemaVersion: 'meta:schema-version',
} as const;

/** Letters that Unicode normalisation does not decompose into ASCII. */
const TRANSLITERATE: Record<string, string> = {
  ø: 'o',
  æ: 'ae',
  œ: 'oe',
  ß: 'ss',
  đ: 'd',
  ł: 'l',
  þ: 'th',
};

/** Lower-case, URL-safe slug used for brand index keys ("Western Digital" → "western-digital", "RØDE" → "rode"). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[øæœßđłþ]/g, (ch) => TRANSLITERATE[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createKeys(prefix: string) {
  const k = (...parts: string[]) => `${prefix}${parts.join(':')}`;
  const n = KEY_NAMES;

  return {
    prefix,
    // Products
    product: (id: string) => k(n.product, id),
    products: () => k(n.products),
    productsByCategory: (slug: string) => k(n.productsByCategory, slug),
    productsByBrand: (brandSlug: string) => k(n.productsByBrand, brandSlug),
    productsFeatured: () => k(n.productsFeatured),
    productsByCreated: () => k(n.productsByCreated),
    productsByPrice: () => k(n.productsByPrice),
    productsBySales: () => k(n.productsBySales),
    // Inventory
    inventory: () => k(n.inventory),
    inventoryLowStock: () => k(n.inventoryLowStock),
    inventoryOutOfStock: () => k(n.inventoryOutOfStock),
    // Customers
    customer: (id: string) => k(n.customer, id),
    customerEmail: (email: string) => k(n.customerEmail, email.toLowerCase()),
    customers: () => k(n.customers),
    // Carts
    cart: (customerId: string) => k(n.cart, customerId),
    // Orders
    order: (id: string) => k(n.order, id),
    orders: () => k(n.orders),
    ordersByCustomer: (customerId: string) => k(n.ordersByCustomer, customerId),
    ordersByStatus: (status: string) => k(n.ordersByStatus, status),
    // System
    counterOrder: () => k(n.counterOrder),
    counterCustomer: () => k(n.counterCustomer),
    schemaVersion: () => k(n.schemaVersion),
  } as const;
}

export type RedisKeys = ReturnType<typeof createKeys>;
