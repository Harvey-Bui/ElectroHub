import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { address } from '../helpers/fixtures.js';
import { openTestRedis, TEST_CART_TTL_SECONDS } from '../helpers/redis.js';

const redis = await openTestRedis('customers');

// One connection for both suites; closed after the whole file.
afterAll(async () => {
  await redis?.close();
});

describe.skipIf(!redis)('CustomerRepository (Redis)', () => {
  const { client, keys, repos } = redis!;
  const { customers, carts } = repos;

  beforeEach(async () => {
    await redis!.flush();
  });

  it('creates customers with sequential ids and an email lookup', async () => {
    const a = await customers.create({ email: 'Ann@Example.com', name: 'Ann', address });
    const b = await customers.create({ email: 'bob@example.com', name: 'Bob' });

    expect(a.id).toBe('cus_000001');
    expect(b.id).toBe('cus_000002');
    expect(a.email).toBe('ann@example.com');
    expect(await client.get(keys.customerEmail('ann@example.com'))).toBe(a.id);
    expect(await customers.findByEmail('ANN@example.com')).toEqual(a);
    expect((await customers.findById(b.id))?.address).toBeNull();
    expect(await customers.count()).toBe(2);
  });

  it('enforces unique emails, including concurrent sign-ups', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => customers.create({ email: 'same@example.com', name: 'X' })),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await customers.count()).toBe(1);
  });

  it('re-points the email lookup when the email changes', async () => {
    const c = await customers.create({ email: 'old@example.com', name: 'Cat' });
    await customers.create({ email: 'taken@example.com', name: 'Dan' });

    const updated = await customers.update(c.id, { email: 'new@example.com', name: 'Catherine' });
    expect(updated).toMatchObject({ email: 'new@example.com', name: 'Catherine' });
    expect(await client.exists(keys.customerEmail('old@example.com'))).toBe(0);
    expect(await customers.findByEmail('new@example.com')).toMatchObject({ id: c.id });

    await expect(customers.update(c.id, { email: 'taken@example.com' })).rejects.toMatchObject({
      status: 409,
    });
    expect((await customers.findById(c.id))?.email).toBe('new@example.com');
    expect(await customers.update('cus_999999', { name: 'Nobody' })).toBeNull();
  });

  it('deletes profile, email lookup and cart', async () => {
    const c = await customers.create({ email: 'gone@example.com', name: 'Eve' });
    await carts.addItem(c.id, 'p1', 2);

    expect(await customers.delete(c.id)).toBe(true);
    expect(await customers.findById(c.id)).toBeNull();
    expect(await customers.findByEmail('gone@example.com')).toBeNull();
    expect(await carts.getItems(c.id)).toEqual([]);
    expect(await customers.delete(c.id)).toBe(false);
  });
});

describe.skipIf(!redis)('CartRepository (Redis)', () => {
  const { repos } = redis!;
  const { carts } = repos;

  beforeEach(async () => {
    await redis!.flush();
  });

  it('adds, increments, sets and removes lines', async () => {
    expect(await carts.addItem('cus_1', 'mouse', 1)).toBe(1);
    expect(await carts.addItem('cus_1', 'mouse', 2)).toBe(3);
    await carts.setQuantity('cus_1', 'monitor', 1);

    expect(await carts.getItems('cus_1')).toEqual([
      { productId: 'monitor', quantity: 1 },
      { productId: 'mouse', quantity: 3 },
    ]);
    expect(await carts.lineCount('cus_1')).toBe(2);

    await carts.setQuantity('cus_1', 'mouse', 0);
    expect(await carts.getItems('cus_1')).toEqual([{ productId: 'monitor', quantity: 1 }]);
    expect(await carts.removeItem('cus_1', 'monitor')).toBe(true);
    expect(await carts.getItems('cus_1')).toEqual([]);
  });

  it('applies a sliding TTL and validates quantities', async () => {
    await carts.addItem('cus_2', 'mouse');
    const ttl = await carts.ttl('cus_2');
    expect(ttl).toBeGreaterThan(TEST_CART_TTL_SECONDS - 5);
    expect(ttl).toBeLessThanOrEqual(TEST_CART_TTL_SECONDS);

    await expect(carts.addItem('cus_2', 'mouse', 0)).rejects.toMatchObject({ status: 400 });
    await expect(carts.setQuantity('cus_2', 'mouse', 1.5)).rejects.toMatchObject({ status: 400 });

    await carts.clear('cus_2');
    expect(await carts.ttl('cus_2')).toBeNull();
  });
});
