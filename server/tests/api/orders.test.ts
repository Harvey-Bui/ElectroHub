import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { checkoutPayload, openTestApp } from '../helpers/api.js';

const t = await openTestApp('orders');

describe.skipIf(!t)('Checkout & order endpoints', () => {
  let shopper: ReturnType<typeof request.agent>;
  const stock = (id: string) => t!.repos.inventory.getStock(id);

  beforeEach(async () => {
    await t!.reset();
    shopper = request.agent(t!.app);
  });
  afterAll(async () => {
    await t!.redis.close();
  });

  const fillCart = async () => {
    await shopper.post('/api/cart/items').send({ productId: 'mouse-a', quantity: 2 });
    await shopper.post('/api/cart/items').send({ productId: 'laptop-a', quantity: 1 });
  };

  describe('POST /api/checkout', () => {
    it('creates the order, takes stock, clears the cart and indexes the order', async () => {
      await fillCart();
      const res = await shopper.post('/api/checkout').send(checkoutPayload);

      expect(res.status).toBe(201);
      expect(res.headers.location).toBe(`/api/orders/${res.body.data.id}`);
      const order = res.body.data;
      expect(order).toMatchObject({
        id: 'ord_000001',
        status: 'pending',
        itemCount: 3,
        subtotalCents: 160000,
        shippingCents: 0,
        totalCents: 160000,
        contact: { email: 'shopper@example.com', name: 'Sam Shopper' },
        shippingAddress: checkoutPayload.shippingAddress,
      });
      expect(order.items).toEqual([
        { productId: 'laptop-a', name: 'Alpha Laptop', unitPriceCents: 150000, quantity: 1 },
        { productId: 'mouse-a', name: 'Alpha Mouse', unitPriceCents: 5000, quantity: 2 },
      ]);

      expect(await stock('mouse-a')).toBe(8);
      expect(await stock('laptop-a')).toBe(0);
      expect((await shopper.get('/api/cart')).body.data.items).toEqual([]);

      const { client, keys } = t!.redis;
      expect(await client.sIsMember(keys.ordersByStatus('pending'), order.id)).toBe(1);
      expect(await client.zScore(keys.ordersByCustomer(order.customerId), order.id)).not.toBeNull();
      expect(await client.get(keys.statsRevenue())).toBe('160000');
      expect(await client.hGet(keys.customer(order.customerId), 'email')).toBe(
        'shopper@example.com',
      );
    });

    it('charges flat shipping on small orders', async () => {
      await shopper.post('/api/cart/items').send({ productId: 'mouse-a', quantity: 1 });
      const res = await shopper.post('/api/checkout').send(checkoutPayload);
      expect(res.body.data).toMatchObject({
        subtotalCents: 5000,
        shippingCents: 999,
        totalCents: 5999,
      });
    });

    it('returns 400 EMPTY_CART for an empty cart', async () => {
      const res = await shopper.post('/api/checkout').send(checkoutPayload);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EMPTY_CART');
    });

    it('returns 409 INSUFFICIENT_STOCK and changes nothing when stock ran out', async () => {
      await fillCart();
      // Someone else buys the last laptop between add-to-cart and checkout.
      await t!.repos.inventory.setStock('laptop-a', 0);

      const res = await shopper.post('/api/checkout').send(checkoutPayload);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({
        code: 'INSUFFICIENT_STOCK',
        details: { productId: 'laptop-a', requested: 1, available: 0 },
      });
      expect(await stock('mouse-a')).toBe(10); // all-or-nothing: mouse stock untouched
      expect((await shopper.get('/api/cart')).body.data.itemCount).toBe(3); // cart kept
      expect(await t!.redis.client.zCard(t!.redis.keys.orders())).toBe(0);
    });

    it('sells the last unit to exactly one of two concurrent shoppers', async () => {
      const other = request.agent(t!.app);
      await shopper.post('/api/cart/items').send({ productId: 'laptop-a', quantity: 1 });
      await other.post('/api/cart/items').send({ productId: 'laptop-a', quantity: 1 });

      const results = await Promise.all([
        shopper.post('/api/checkout').send(checkoutPayload),
        other.post('/api/checkout').send(checkoutPayload),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await stock('laptop-a')).toBe(0);
    });

    it('returns 409 PRODUCT_UNAVAILABLE if a cart product was deleted', async () => {
      await fillCart();
      await t!.repos.products.delete('laptop-a');
      const res = await shopper.post('/api/checkout').send(checkoutPayload);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({
        code: 'PRODUCT_UNAVAILABLE',
        details: { productIds: ['laptop-a'] },
      });
    });

    it.each([
      [{ ...checkoutPayload, email: 'not-an-email' }, 'email'],
      [{ ...checkoutPayload, name: '' }, 'name'],
      [
        {
          ...checkoutPayload,
          shippingAddress: { ...checkoutPayload.shippingAddress, country: 'USA' },
        },
        'shippingAddress.country',
      ],
      [{ email: 'a@b.co', name: 'A' }, 'shippingAddress'],
    ])('rejects invalid checkout body (%#) with 400', async (body, field) => {
      // prettier-ignore
      await fillCart();
      const res = await shopper.post('/api/checkout').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain(field);
    });
  });

  describe('GET /api/orders and /api/orders/:id', () => {
    it("lists only the shopper's own orders, newest first", async () => {
      await shopper.post('/api/cart/items').send({ productId: 'mouse-a', quantity: 1 });
      const first = (await shopper.post('/api/checkout').send(checkoutPayload)).body.data;
      await new Promise((r) => setTimeout(r, 5));
      await shopper.post('/api/cart/items').send({ productId: 'monitor-a', quantity: 1 });
      const second = (await shopper.post('/api/checkout').send(checkoutPayload)).body.data;

      const other = request.agent(t!.app);
      await other.post('/api/cart/items').send({ productId: 'mouse-a', quantity: 1 });
      await other.post('/api/checkout').send(checkoutPayload);

      const res = await shopper.get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body.data.map((o: { id: string }) => o.id)).toEqual([second.id, first.id]);
      expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });

      expect((await shopper.get(`/api/orders/${first.id}`)).body.data.id).toBe(first.id);
    });

    it("hides other shoppers' orders behind 404", async () => {
      await shopper.post('/api/cart/items').send({ productId: 'mouse-a', quantity: 1 });
      const order = (await shopper.post('/api/checkout').send(checkoutPayload)).body.data;

      const stranger = request.agent(t!.app);
      const res = await stranger.get(`/api/orders/${order.id}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
      expect((await stranger.post(`/api/orders/${order.id}/cancel`)).status).toBe(404);
    });

    it('rejects malformed order ids with 400', async () => {
      const res = await shopper.get('/api/orders/12345');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/orders/:id/cancel', () => {
    it('cancels, returns stock, reverses revenue and best-seller counts', async () => {
      await fillCart();
      const order = (await shopper.post('/api/checkout').send(checkoutPayload)).body.data;
      const { client, keys } = t!.redis;
      expect(await client.zScore(keys.productsBySales(), 'mouse-a')).toBe(2);

      const res = await shopper.post(`/api/orders/${order.id}/cancel`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');

      expect(await stock('mouse-a')).toBe(10);
      expect(await stock('laptop-a')).toBe(1);
      expect(await client.get(keys.statsRevenue())).toBe('0');
      expect(await client.zScore(keys.productsBySales(), 'mouse-a')).toBe(0);
      expect(await client.sIsMember(keys.ordersByStatus('cancelled'), order.id)).toBe(1);
      expect(await client.sIsMember(keys.ordersByStatus('pending'), order.id)).toBe(0);
    });

    it('refuses to cancel twice (409) and returns stock only once under concurrency', async () => {
      await fillCart();
      const order = (await shopper.post('/api/checkout').send(checkoutPayload)).body.data;

      const results = await Promise.all([
        shopper.post(`/api/orders/${order.id}/cancel`),
        shopper.post(`/api/orders/${order.id}/cancel`),
        shopper.post(`/api/orders/${order.id}/cancel`),
      ]);
      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      for (const r of results.filter((r) => r.status !== 200)) {
        expect(r.status).toBe(409);
        expect(['ORDER_NOT_CANCELLABLE', 'INVALID_STATUS_TRANSITION']).toContain(r.body.error.code);
      }
      expect(await stock('mouse-a')).toBe(10); // not 12
    });

    it('refuses to cancel once the order has shipped', async () => {
      await fillCart();
      const order = (await shopper.post('/api/checkout').send(checkoutPayload)).body.data;
      await t!.services.orders.updateStatusForAdmin(order.id, 'paid');
      await t!.services.orders.updateStatusForAdmin(order.id, 'shipped');

      const res = await shopper.post(`/api/orders/${order.id}/cancel`);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({
        code: 'ORDER_NOT_CANCELLABLE',
        details: { status: 'shipped' },
      });
      expect(await stock('mouse-a')).toBe(8);
    });
  });
});
