import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { CUSTOMER_COOKIE } from '../../src/lib/cookies.js';
import { findCookie, openTestApp } from '../helpers/api.js';

const t = await openTestApp('cart');

describe.skipIf(!t)('Cart endpoints', () => {
  let shopper: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    await t!.reset();
    shopper = request.agent(t!.app);
  });
  afterAll(async () => {
    await t!.redis.close();
  });

  it('issues a signed, HTTP-only customer cookie and returns an empty cart', async () => {
    const res = await shopper.get('/api/cart');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      items: [],
      itemCount: 0,
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
      hasStockIssues: false,
      removedProductIds: [],
    });
    const cookie = findCookie(res.headers['set-cookie'], CUSTOMER_COOKIE);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/api' });
    expect(cookie!.raw).toMatch(/^eh_customer=s%3Acus_[a-f0-9]{24}\./); // "s:" = signed

    // The same cookie is reused, not re-issued.
    const again = await shopper.get('/api/cart');
    expect(findCookie(again.headers['set-cookie'], CUSTOMER_COOKIE)).toBeUndefined();
  });

  it('adds items, merges repeated adds and prices the cart from Redis', async () => {
    const first = await shopper.post('/api/cart/items').send({ productId: 'mouse-a', quantity: 1 });
    expect(first.status).toBe(201);

    const res = await shopper.post('/api/cart/items').send({ productId: 'mouse-a', quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.data.items).toEqual([
      expect.objectContaining({
        productId: 'mouse-a',
        name: 'Alpha Mouse',
        quantity: 3,
        unitPriceCents: 5000,
        lineTotalCents: 15000,
        stock: 10,
        exceedsStock: false,
      }),
    ]);
    // 15000 ≥ 10000 → free shipping
    expect(res.body.data).toMatchObject({ itemCount: 3, subtotalCents: 15000, shippingCents: 0 });

    const customerId = (await t!.redis.client.keys(`${t!.redis.keys.prefix}cart:*`))[0]!;
    expect(await t!.redis.client.hGet(customerId, 'mouse-a')).toBe('3');
  });

  it('charges flat shipping below the free-shipping threshold', async () => {
    await shopper.post('/api/cart/items').send({ productId: 'mouse-a' }); // default quantity 1
    const res = await shopper.get('/api/cart');
    expect(res.body.data).toMatchObject({
      subtotalCents: 5000,
      shippingCents: 999,
      totalCents: 5999,
    });
  });

  it('rejects unknown products (404), out-of-stock (409) and over-stock quantities (409)', async () => {
    const unknown = await shopper.post('/api/cart/items').send({ productId: 'ghost', quantity: 1 });
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('PRODUCT_NOT_FOUND');

    const oos = await shopper.post('/api/cart/items').send({ productId: 'mouse-b', quantity: 1 });
    expect(oos.status).toBe(409);
    expect(oos.body.error.code).toBe('OUT_OF_STOCK');

    await shopper.post('/api/cart/items').send({ productId: 'monitor-a', quantity: 2 });
    const tooMany = await shopper
      .post('/api/cart/items')
      .send({ productId: 'monitor-a', quantity: 2 });
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error).toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      details: { requested: 4, available: 3, inCart: 2 },
    });
  });

  it.each([
    [{ quantity: 1 }, 'productId'],
    [{ productId: 'mouse-a', quantity: 0 }, 'quantity'],
    [{ productId: 'mouse-a', quantity: 1.5 }, 'quantity'],
    [{ productId: 'mouse-a', quantity: '2' }, 'quantity'],
    [{ productId: '../etc', quantity: 1 }, 'productId'],
  ])('rejects invalid body %j with 400', async (body, field) => {
    const res = await shopper.post('/api/cart/items').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe(field);
  });

  it('updates quantities with stock checks; 0 removes the line', async () => {
    await shopper.post('/api/cart/items').send({ productId: 'monitor-a', quantity: 1 });

    const updated = await shopper.put('/api/cart/items/monitor-a').send({ quantity: 3 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.items[0].quantity).toBe(3);

    const over = await shopper.put('/api/cart/items/monitor-a').send({ quantity: 4 });
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe('INSUFFICIENT_STOCK');

    const removed = await shopper.put('/api/cart/items/monitor-a').send({ quantity: 0 });
    expect(removed.body.data.items).toEqual([]);

    const notInCart = await shopper.put('/api/cart/items/mouse-a').send({ quantity: 1 });
    expect(notInCart.status).toBe(404);
    expect(notInCart.body.error.code).toBe('CART_ITEM_NOT_FOUND');
  });

  it('removes single items and clears the cart', async () => {
    await shopper.post('/api/cart/items').send({ productId: 'mouse-a', quantity: 1 });
    await shopper.post('/api/cart/items').send({ productId: 'laptop-a', quantity: 1 });

    const res = await shopper.delete('/api/cart/items/mouse-a');
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((i: { productId: string }) => i.productId)).toEqual([
      'laptop-a',
    ]);
    expect((await shopper.delete('/api/cart/items/mouse-a')).status).toBe(404);

    expect((await shopper.delete('/api/cart')).status).toBe(204);
    expect((await shopper.get('/api/cart')).body.data.items).toEqual([]);
  });

  it('flags lines whose stock fell and drops lines whose product was deleted', async () => {
    await shopper.post('/api/cart/items').send({ productId: 'monitor-a', quantity: 3 });
    await shopper.post('/api/cart/items').send({ productId: 'mouse-a', quantity: 1 });
    await t!.repos.inventory.setStock('monitor-a', 1);
    await t!.repos.products.delete('mouse-a');

    const res = await shopper.get('/api/cart');
    expect(res.body.data.hasStockIssues).toBe(true);
    expect(res.body.data.items[0]).toMatchObject({ productId: 'monitor-a', exceedsStock: true });
    expect(res.body.data.removedProductIds).toEqual(['mouse-a']);
    expect((await shopper.get('/api/cart')).body.data.removedProductIds).toEqual([]);
  });

  it('keeps carts separate per shopper and ignores tampered cookies', async () => {
    await shopper.post('/api/cart/items').send({ productId: 'mouse-a', quantity: 2 });

    const other = request.agent(t!.app);
    expect((await other.get('/api/cart')).body.data.items).toEqual([]);

    // A forged (unsigned) cookie naming someone else's id is ignored → fresh empty cart.
    const victim = (await t!.redis.client.keys(`${t!.redis.keys.prefix}cart:*`))[0]!
      .split(':')
      .pop();
    const forged = await request(t!.app)
      .get('/api/cart')
      .set('Cookie', `${CUSTOMER_COOKIE}=${victim}`);
    expect(forged.body.data.items).toEqual([]);
    expect(findCookie(forged.headers['set-cookie'], CUSTOMER_COOKIE)?.raw).not.toContain(victim);
  });
});
