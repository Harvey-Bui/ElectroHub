import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_COOKIE } from '../../src/lib/cookies.js';
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  checkoutPayload,
  findCookie,
  openTestApp,
} from '../helpers/api.js';

const t = await openTestApp('admin', { loginMaxAttempts: 3 });

describe.skipIf(!t)('Admin endpoints', () => {
  let admin: ReturnType<typeof request.agent>;

  const login = async (agent = request.agent(t!.app)) => {
    const res = await agent
      .post('/api/admin/login')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    return agent;
  };

  beforeEach(async () => {
    await t!.reset();
    admin = await login();
  });
  afterAll(async () => {
    await t!.redis.close();
  });

  describe('authentication', () => {
    it('sets a signed HTTP-only SameSite=Strict session cookie and never returns secrets', async () => {
      const res = await request(t!.app)
        .post('/api/admin/login')
        .send({ username: 'TEST-ADMIN', password: ADMIN_PASSWORD }); // username is case-insensitive

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ username: ADMIN_USERNAME, expiresAt: expect.any(String) });
      expect(JSON.stringify(res.body)).not.toMatch(/scrypt|password/i);
      expect(res.headers['cache-control']).toBe('no-store');
      const cookie = findCookie(res.headers['set-cookie'], ADMIN_COOKIE);
      expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/api/admin' });

      // Only the SHA-256 of the token is stored in Redis.
      const sessions = await t!.redis.client.keys(`${t!.redis.keys.prefix}session:admin:*`);
      expect(sessions.length).toBeGreaterThan(0);
      for (const key of sessions) expect(key).toMatch(/session:admin:[a-f0-9]{64}$/);
    });

    it('rejects wrong passwords and unknown users with the same 401', async () => {
      const wrong = await request(t!.app)
        .post('/api/admin/login')
        .send({ username: ADMIN_USERNAME, password: 'nope' });
      const unknown = await request(t!.app)
        .post('/api/admin/login')
        .send({ username: 'mallory', password: 'nope' });

      for (const res of [wrong, unknown]) {
        expect(res.status).toBe(401);
        expect(res.body).toEqual({
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
        });
        expect(findCookie(res.headers['set-cookie'], ADMIN_COOKIE)).toBeUndefined();
      }
    });

    it('locks out after too many failed attempts (429 + Retry-After)', async () => {
      for (let i = 0; i < 3; i++) {
        await request(t!.app)
          .post('/api/admin/login')
          .send({ username: ADMIN_USERNAME, password: 'x' });
      }
      const res = await request(t!.app)
        .post('/api/admin/login')
        .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }); // even the right password
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('validates the login body', async () => {
      const res = await request(t!.app).post('/api/admin/login').send({ username: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it.each([
      ['get', '/api/admin/me'],
      ['get', '/api/admin/dashboard'],
      ['get', '/api/admin/orders'],
      ['get', '/api/admin/inventory/low-stock'],
      ['post', '/api/admin/products'],
      ['put', '/api/admin/products/mouse-a'],
      ['delete', '/api/admin/products/mouse-a'],
      ['put', '/api/admin/orders/ord_000001/status'],
    ] as const)('protects %s %s with 401', async (method, path) => {
      const res = await request(t!.app)[method](path).send({});
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects forged or tampered session cookies', async () => {
      const res = await request(t!.app)
        .get('/api/admin/me')
        .set('Cookie', `${ADMIN_COOKIE}=s%3Aforged-token.invalidsignature`);
      expect(res.status).toBe(401);
    });

    it('logout deletes the session so the cookie stops working', async () => {
      expect((await admin.get('/api/admin/me')).body.data.username).toBe(ADMIN_USERNAME);

      const res = await admin.post('/api/admin/logout');
      expect(res.status).toBe(204);
      expect(findCookie(res.headers['set-cookie'], ADMIN_COOKIE)?.cleared).toBe(true);
      expect(await t!.redis.client.keys(`${t!.redis.keys.prefix}session:admin:*`)).toEqual([]);
      expect((await admin.get('/api/admin/me')).status).toBe(401);
    });
  });

  describe('product management', () => {
    const newProduct = {
      name: 'Gamma Headset',
      brand: 'SteelSeries',
      category: 'headphones',
      description: 'Wireless gaming headset.',
      priceCents: 19999,
      stock: 4,
      specs: { wireless: true, batteryHours: 38 },
      imageUrl: 'https://placehold.co/600x400/png',
    };

    it('creates a product with a generated id and indexes it', async () => {
      const res = await admin.post('/api/admin/products').send(newProduct);
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        id: 'gamma-headset',
        stock: 4,
        brandSlug: 'steelseries',
      });
      expect(res.headers.location).toBe('/api/products/gamma-headset');

      const listed = await request(t!.app).get('/api/products/category/headphones');
      expect(listed.body.data.map((p: { id: string }) => p.id)).toEqual(['gamma-headset']);
      expect(await t!.redis.client.zScore(t!.redis.keys.inventoryLowStock(), 'gamma-headset')).toBe(
        4,
      );
    });

    it('returns 409 PRODUCT_EXISTS for duplicates and 400 for invalid products', async () => {
      await admin.post('/api/admin/products').send(newProduct);
      const dup = await admin.post('/api/admin/products').send(newProduct);
      expect(dup.status).toBe(409);
      expect(dup.body.error.code).toBe('PRODUCT_EXISTS');

      const invalid = await admin.post('/api/admin/products').send({
        ...newProduct,
        id: 'x2',
        priceCents: -1,
        category: 'toasters',
        imageUrl: 'not a url',
      });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual([
        'category',
        'imageUrl',
        'priceCents',
      ]);
    });

    it('updates fields, moves category indexes and sets stock', async () => {
      const res = await admin
        .put('/api/admin/products/mouse-a')
        .send({ category: 'monitors', priceCents: 4500, stock: 0 });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ category: 'monitors', priceCents: 4500, stock: 0 });
      // Fields not sent are kept (regression: Zod defaults must not reset them).
      expect(res.body.data).toMatchObject({
        featured: true,
        specs: { dpi: 26000 },
        name: 'Alpha Mouse',
      });
      expect(await t!.redis.client.sIsMember(t!.redis.keys.productsFeatured(), 'mouse-a')).toBe(1);

      const mice = await request(t!.app).get('/api/products/category/mice');
      expect(mice.body.data.map((p: { id: string }) => p.id)).toEqual(['mouse-b']);
      expect(await t!.repos.inventory.outOfStock()).toEqual(['mouse-a', 'mouse-b']);
    });

    it('rejects empty updates and unknown products', async () => {
      expect((await admin.put('/api/admin/products/mouse-a').send({})).status).toBe(400);
      const missing = await admin.put('/api/admin/products/ghost').send({ priceCents: 1 });
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('deletes products (204) and 404s afterwards', async () => {
      expect((await admin.delete('/api/admin/products/mouse-a')).status).toBe(204);
      expect((await request(t!.app).get('/api/products/mouse-a')).status).toBe(404);
      expect((await admin.delete('/api/admin/products/mouse-a')).status).toBe(404);
    });
  });

  describe('orders, inventory and dashboard', () => {
    const placeOrder = async () => {
      const shopper = request.agent(t!.app);
      await shopper.post('/api/cart/items').send({ productId: 'monitor-a', quantity: 1 });
      return (await shopper.post('/api/checkout').send(checkoutPayload)).body.data as {
        id: string;
        totalCents: number;
      };
    };

    it('lists and filters orders by status', async () => {
      const a = await placeOrder();
      const b = await placeOrder();
      await admin.put(`/api/admin/orders/${a.id}/status`).send({ status: 'paid' });

      const all = await admin.get('/api/admin/orders');
      expect(all.body.pagination.total).toBe(2);
      const paid = await admin.get('/api/admin/orders?status=paid');
      expect(paid.body.data.map((o: { id: string }) => o.id)).toEqual([a.id]);
      const pending = await admin.get('/api/admin/orders?status=pending');
      expect(pending.body.data.map((o: { id: string }) => o.id)).toEqual([b.id]);
      expect((await admin.get('/api/admin/orders?status=lost')).status).toBe(400);
      expect((await admin.get(`/api/admin/orders/${a.id}`)).body.data.status).toBe('paid');
    });

    it('enforces status transitions and restocks on admin cancellation', async () => {
      const order = await placeOrder();
      expect(await t!.repos.inventory.getStock('monitor-a')).toBe(2);

      const skip = await admin
        .put(`/api/admin/orders/${order.id}/status`)
        .send({ status: 'delivered' });
      expect(skip.status).toBe(409);
      expect(skip.body.error).toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
        details: { from: 'pending', to: 'delivered', allowed: ['paid', 'cancelled'] },
      });

      const cancelled = await admin
        .put(`/api/admin/orders/${order.id}/status`)
        .send({ status: 'cancelled' });
      expect(cancelled.status).toBe(200);
      expect(await t!.repos.inventory.getStock('monitor-a')).toBe(3);

      const missing = await admin
        .put('/api/admin/orders/ord_999999/status')
        .send({ status: 'paid' });
      expect(missing.status).toBe(404);
      const invalid = await admin
        .put(`/api/admin/orders/${order.id}/status`)
        .send({ status: 'lost' });
      expect(invalid.status).toBe(400);
    });

    it('reports low stock, lowest first', async () => {
      const res = await admin.get('/api/admin/inventory/low-stock');
      expect(res.status).toBe(200);
      expect(
        res.body.data.map((e: { productId: string; stock: number }) => [e.productId, e.stock]),
      ).toEqual([
        ['mouse-b', 0],
        ['laptop-a', 1],
        ['monitor-a', 3],
      ]);
    });

    it('builds the dashboard from live Redis data', async () => {
      const kept = await placeOrder();
      const cancelled = await placeOrder();
      await admin.put(`/api/admin/orders/${cancelled.id}/status`).send({ status: 'cancelled' });

      const res = await admin.get('/api/admin/dashboard');
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('no-store');
      const d = res.body.data;
      expect(d.catalog.products).toBe(4);
      expect(d.customers).toBe(2);
      expect(d.orders).toMatchObject({
        total: 2,
        byStatus: { pending: 1, cancelled: 1, paid: 0, shipped: 0, delivered: 0 },
        revenueCents: kept.totalCents,
        averageOrderCents: kept.totalCents,
      });
      expect(d.inventory).toMatchObject({ trackedProducts: 4, outOfStock: 1 });
      expect(d.topSellers).toEqual([
        { productId: 'monitor-a', name: 'Alpha Monitor', unitsSold: 1 },
      ]);
      expect(d.recentOrders.map((o: { id: string }) => o.id)).toEqual([cancelled.id, kept.id]);
    });
  });
});
