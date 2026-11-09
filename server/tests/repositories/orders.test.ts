import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { OrderItem } from '../../src/schemas/order.js';
import { address, productInput } from '../helpers/fixtures.js';
import { openTestRedis } from '../helpers/redis.js';

const redis = await openTestRedis('orders');

describe.skipIf(!redis)('OrderRepository (Redis)', () => {
  const { client, keys, repos } = redis!;
  const { orders, carts, inventory, products } = repos;

  const items: OrderItem[] = [
    { productId: 'kb', name: 'Keyboard', unitPriceCents: 5000, quantity: 2 },
    { productId: 'ms', name: 'Mouse', unitPriceCents: 2500, quantity: 1 },
  ];

  beforeEach(async () => {
    await redis!.flush();
  });
  afterAll(async () => {
    await redis!.close();
  });

  it('writes the order with totals and all indexes, and clears the cart', async () => {
    await carts.addItem('cus_1', 'kb', 2);
    const order = await orders.create(
      { customerId: 'cus_1', items, shippingAddress: address, shippingCents: 999 },
      { clearCart: true },
    );

    expect(order).toMatchObject({
      id: 'ord_000001',
      status: 'pending',
      itemCount: 3,
      subtotalCents: 12500,
      totalCents: 13499,
    });
    expect(await orders.findById(order.id)).toEqual(order);
    expect(await client.zScore(keys.orders(), order.id)).toBe(Date.parse(order.createdAt));
    expect(await client.zScore(keys.ordersByCustomer('cus_1'), order.id)).not.toBeNull();
    expect(await client.sIsMember(keys.ordersByStatus('pending'), order.id)).toBe(1);
    expect(await client.zScore(keys.productsBySales(), 'kb')).toBe(2);
    expect(await carts.getItems('cus_1')).toEqual([]);
  });

  it('lists a customer history newest first', async () => {
    const first = await orders.create({ customerId: 'cus_2', items, shippingAddress: address });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await orders.create({ customerId: 'cus_2', items, shippingAddress: address });
    await orders.create({ customerId: 'cus_3', items, shippingAddress: address });

    const history = await orders.listByCustomer('cus_2');
    expect(history.total).toBe(2);
    expect(history.items.map((o) => o.id)).toEqual([second.id, first.id]);
    expect((await orders.listRecent()).total).toBe(3);
  });

  it('moves orders between status sets only along allowed transitions', async () => {
    const order = await orders.create({ customerId: 'cus_4', items, shippingAddress: address });

    await orders.updateStatus(order.id, 'paid');
    expect(await client.sIsMember(keys.ordersByStatus('pending'), order.id)).toBe(0);
    expect(await client.sIsMember(keys.ordersByStatus('paid'), order.id)).toBe(1);

    await expect(orders.updateStatus(order.id, 'delivered')).rejects.toMatchObject({ status: 409 });
    await orders.updateStatus(order.id, 'shipped');
    const delivered = await orders.updateStatus(order.id, 'delivered');
    expect(delivered.status).toBe('delivered');
    await expect(orders.updateStatus(order.id, 'cancelled')).rejects.toMatchObject({ status: 409 });
    await expect(orders.updateStatus('ord_999999', 'paid')).rejects.toMatchObject({ status: 404 });

    expect(await orders.countByStatus()).toEqual({
      pending: 0,
      paid: 0,
      shipped: 0,
      delivered: 1,
      cancelled: 0,
    });
    expect((await orders.listByStatus('delivered')).map((o) => o.id)).toEqual([order.id]);
  });

  it('supports the checkout flow: reserve stock, place order, release on cancel', async () => {
    await products.create(productInput({ id: 'kb', stock: 2, priceCents: 5000 }));
    await products.create(productInput({ id: 'ms', stock: 1, priceCents: 2500 }));
    const lines = items.map(({ productId, quantity }) => ({ productId, quantity }));

    expect(await inventory.reserve(lines)).toEqual({ ok: true });
    const order = await orders.create({ customerId: 'cus_5', items, shippingAddress: address });
    expect(await inventory.outOfStock()).toEqual(['kb', 'ms']);
    expect((await products.topSelling(1))[0]).toMatchObject({ unitsSold: 2 });

    await orders.updateStatus(order.id, 'cancelled');
    await inventory.release(lines);
    expect(await inventory.getStocks(['kb', 'ms'])).toEqual(new Map([['kb', 2], ['ms', 1]])); // prettier-ignore
  });
});
