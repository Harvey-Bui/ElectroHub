import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { productInput } from '../helpers/fixtures.js';
import { openTestRedis, TEST_LOW_STOCK_THRESHOLD } from '../helpers/redis.js';

const redis = await openTestRedis('inventory');

describe.skipIf(!redis)('InventoryRepository (Redis)', () => {
  const { client, keys, repos } = redis!;
  const { inventory, products } = repos;

  beforeEach(async () => {
    await redis!.flush();
  });
  afterAll(async () => {
    await redis!.close();
  });

  it('keeps low-stock and out-of-stock indexes in sync with the stock level', async () => {
    await products.create(productInput({ id: 'x', stock: 20 }));
    expect(await client.zScore(keys.inventoryLowStock(), 'x')).toBeNull();

    await inventory.setStock('x', TEST_LOW_STOCK_THRESHOLD);
    expect(await client.zScore(keys.inventoryLowStock(), 'x')).toBe(TEST_LOW_STOCK_THRESHOLD);

    await inventory.setStock('x', 0);
    expect(await client.sIsMember(keys.inventoryOutOfStock(), 'x')).toBe(1);
    expect(await inventory.outOfStock()).toEqual(['x']);

    await inventory.adjust('x', 50);
    expect(await inventory.getStock('x')).toBe(50);
    expect(await client.zScore(keys.inventoryLowStock(), 'x')).toBeNull();
    expect(await client.sIsMember(keys.inventoryOutOfStock(), 'x')).toBe(0);
  });

  it('refuses to adjust below zero or for unknown products', async () => {
    await products.create(productInput({ id: 'y', stock: 2 }));
    await expect(inventory.adjust('y', -3)).rejects.toMatchObject({ status: 409 });
    expect(await inventory.getStock('y')).toBe(2);
    await expect(inventory.adjust('nope', 1)).rejects.toMatchObject({ status: 404 });
    await expect(inventory.setStock('nope', 1)).rejects.toMatchObject({ status: 404 });
  });

  it('sells the last unit exactly once under concurrent reservations', async () => {
    await products.create(productInput({ id: 'last', stock: 1 }));

    const results = await Promise.all(
      Array.from({ length: 20 }, () => inventory.reserve([{ productId: 'last', quantity: 1 }])),
    );

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)[0]).toEqual({
      ok: false,
      productId: 'last',
      requested: 1,
      available: 0,
    });
    expect(await inventory.getStock('last')).toBe(0);
    expect(await inventory.outOfStock()).toEqual(['last']);
  });

  it('reserves all lines or none', async () => {
    await products.create(productInput({ id: 'm1', stock: 5 }));
    await products.create(productInput({ id: 'm2', stock: 1 }));

    const failed = await inventory.reserve([
      { productId: 'm1', quantity: 2 },
      { productId: 'm2', quantity: 2 },
    ]);
    expect(failed).toMatchObject({ ok: false, productId: 'm2', available: 1 });
    expect(await inventory.getStock('m1')).toBe(5); // untouched

    // Duplicate lines are merged: 3 + 3 = 6 > 5
    expect((await inventory.reserve([{ productId: 'm1', quantity: 3 }, { productId: 'm1', quantity: 3 }])).ok).toBe(false); // prettier-ignore

    expect(await inventory.reserve([{ productId: 'unknown', quantity: 1 }])).toMatchObject({
      ok: false,
      available: null,
    });

    expect(await inventory.reserve([{ productId: 'm1', quantity: 2 }, { productId: 'm2', quantity: 1 }])).toEqual({ ok: true }); // prettier-ignore
    expect(await inventory.getStocks(['m1', 'm2'])).toEqual(new Map([['m1', 3], ['m2', 0]])); // prettier-ignore
  });

  it('releases stock back and skips deleted products', async () => {
    await products.create(productInput({ id: 'r1', stock: 0 }));
    await products.create(productInput({ id: 'r2', stock: 0 }));
    await products.delete('r2');

    const restocked = await inventory.release([
      { productId: 'r1', quantity: 4 },
      { productId: 'r2', quantity: 4 },
    ]);
    expect(restocked).toBe(1);
    expect(await inventory.getStock('r1')).toBe(4);
    expect(await inventory.getStock('r2')).toBeNull();
    expect(await inventory.outOfStock()).toEqual([]);
  });

  it('ranks low stock lowest-first and summarises totals', async () => {
    await products.create(productInput({ id: 'l3', stock: 3 }));
    await products.create(productInput({ id: 'l0', stock: 0 }));
    await products.create(productInput({ id: 'l1', stock: 1 }));
    await products.create(productInput({ id: 'big', stock: 100 }));

    expect(await inventory.lowStock()).toEqual([
      { productId: 'l0', quantity: 0 },
      { productId: 'l1', quantity: 1 },
      { productId: 'l3', quantity: 3 },
    ]);
    expect(await inventory.summary()).toEqual({
      trackedProducts: 4,
      totalUnits: 104,
      lowStock: 3,
      outOfStock: 1,
      lowStockThreshold: TEST_LOW_STOCK_THRESHOLD,
    });
  });
});
