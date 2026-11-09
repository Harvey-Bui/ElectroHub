/**
 * Central Redis key schema for ElectroHub.
 *
 * node-redis has no built-in key prefixing, so every repository must build its
 * keys through this module. Keeping the layout in one place makes the data
 * model reviewable and prevents collisions between teammates' features.
 *
 * Planned data model (Redis is the system of record, not a cache):
 *
 *   product:{id}                Hash        product fields
 *   products:all                Sorted set  product ids, scored by created-at
 *   products:category:{slug}    Set         product ids in a category
 *   inventory:{productId}       String/int  units in stock (INCRBY/DECRBY, atomic)
 *   cart:{cartId}               Hash        productId -> quantity
 *   order:{id}                  Hash        order header fields
 *   order:{id}:items            List/JSON   line items snapshot at checkout time
 *   orders:all                  Sorted set  order ids, scored by created-at
 *   seq:{name}                  String/int  monotonic id sequences (INCR)
 */
export function createKeys(prefix: string) {
  const k = (...parts: Array<string | number>) => `${prefix}${parts.join(':')}`;

  return {
    product: (id: string) => k('product', id),
    productsAll: () => k('products', 'all'),
    productsByCategory: (slug: string) => k('products', 'category', slug),
    inventory: (productId: string) => k('inventory', productId),
    cart: (cartId: string) => k('cart', cartId),
    order: (id: string) => k('order', id),
    orderItems: (id: string) => k('order', id, 'items'),
    ordersAll: () => k('orders', 'all'),
    sequence: (name: string) => k('seq', name),
  } as const;
}

export type RedisKeys = ReturnType<typeof createKeys>;
