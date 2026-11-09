import { afterAll, describe, expect, it } from 'vitest';
import { SEED_PRODUCTS, seedDatabase } from '../src/db/seed/index.js';
import { CATEGORIES } from '../src/schemas/product.js';
import { openTestRedis } from './helpers/redis.js';

describe('seed data', () => {
  it('has at least 3 products in each of the 7 categories, with valid edge cases', () => {
    expect(SEED_PRODUCTS.length).toBeGreaterThanOrEqual(21);
    for (const category of CATEGORIES) {
      expect(SEED_PRODUCTS.filter((p) => p.category === category).length).toBeGreaterThanOrEqual(3);
    }
    expect(SEED_PRODUCTS.some((p) => p.stock === 0)).toBe(true);
    expect(SEED_PRODUCTS.some((p) => p.stock === 1)).toBe(true);
    expect(new Set(SEED_PRODUCTS.map((p) => p.id)).size).toBe(SEED_PRODUCTS.length);
  });
});

const redis = await openTestRedis('seed');

describe.skipIf(!redis)('seedDatabase (Redis)', () => {
  const { client, keys, repos } = redis!;

  afterAll(async () => {
    await redis!.close();
  });

  it('inserts everything on the first run and populates indexes', async () => {
    await redis!.flush();
    const summary = await seedDatabase(repos);

    expect(summary.products.inserted).toHaveLength(SEED_PRODUCTS.length);
    expect(summary.customers.inserted).toHaveLength(3);
    expect(await client.sCard(keys.products())).toBe(SEED_PRODUCTS.length);
    for (const category of CATEGORIES) {
      const expected = SEED_PRODUCTS.filter((p) => p.category === category).map((p) => p.id);
      expect((await client.sMembers(keys.productsByCategory(category))).sort()).toEqual(
        expected.sort(),
      );
    }
    expect(await client.hLen(keys.inventory())).toBe(SEED_PRODUCTS.length);
    expect(await client.sMembers(keys.inventoryOutOfStock())).toEqual(['msi-katana-15-b13v']);
    expect(await client.zScore(keys.inventoryLowStock(), 'lenovo-thinkpad-x1-carbon-gen12')).toBe(
      1,
    );
  });

  it('is idempotent: a second run inserts nothing and creates no duplicates', async () => {
    const keyCountBefore = (await client.keys(`${keys.prefix}*`)).length;
    const summary = await seedDatabase(repos);

    expect(summary.products.inserted).toEqual([]);
    expect(summary.products.updated).toEqual([]);
    expect(summary.products.unchanged).toHaveLength(SEED_PRODUCTS.length);
    expect(summary.customers.inserted).toEqual([]);
    expect(await client.sCard(keys.products())).toBe(SEED_PRODUCTS.length);
    expect(await client.sCard(keys.customers())).toBe(3);
    expect((await client.keys(`${keys.prefix}*`)).length).toBe(keyCountBefore);
  });

  it('repairs edited products and keeps live stock unless --reset-stock', async () => {
    await repos.products.update('shure-sm7b', { category: 'headphones', priceCents: 1 });
    await repos.inventory.setStock('shure-sm7b', 99);

    const summary = await seedDatabase(repos);
    expect(summary.products.updated).toEqual(['shure-sm7b']);
    expect(await client.sIsMember(keys.productsByCategory('microphones'), 'shure-sm7b')).toBe(1);
    expect(await client.sIsMember(keys.productsByCategory('headphones'), 'shure-sm7b')).toBe(0);
    expect(await repos.inventory.getStock('shure-sm7b')).toBe(99);

    const reset = await seedDatabase(repos, { resetStock: true });
    expect(reset.products.stockReset).toEqual(['shure-sm7b']);
    expect(await repos.inventory.getStock('shure-sm7b')).toBe(11);
  });
});
