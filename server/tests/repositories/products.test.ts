import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { HttpError } from '../../src/lib/httpError.js';
import { productInput } from '../helpers/fixtures.js';
import { openTestRedis } from '../helpers/redis.js';

const redis = await openTestRedis('products');

describe.skipIf(!redis)('ProductRepository (Redis)', () => {
  const { client, keys, repos } = redis!;
  const products = repos.products;

  beforeEach(async () => {
    await redis!.flush();
  });
  afterAll(async () => {
    await redis!.close();
  });

  it('creates the product hash, inventory record and every index atomically', async () => {
    const input = productInput({ id: 'p1', brand: 'Western Digital', featured: true, stock: 3 });
    const created = await products.create(input);

    expect(created.brandSlug).toBe('western-digital');
    const hash = await client.hGetAll(keys.product('p1'));
    expect(hash.name).toBe(input.name);
    expect(JSON.parse(hash.specs!)).toEqual(input.specs);
    expect(hash.stock).toBeUndefined(); // stock lives in the inventory hash only

    expect(await client.sIsMember(keys.products(), 'p1')).toBe(1);
    expect(await client.sIsMember(keys.productsByCategory('mice'), 'p1')).toBe(1);
    expect(await client.sIsMember(keys.productsByBrand('western-digital'), 'p1')).toBe(1);
    expect(await client.sIsMember(keys.productsFeatured(), 'p1')).toBe(1);
    expect(await client.zScore(keys.productsByPrice(), 'p1')).toBe(input.priceCents);
    expect(await client.zScore(keys.productsBySales(), 'p1')).toBe(0);
    expect(await client.hGet(keys.inventory(), 'p1')).toBe('3');
    expect(await client.zScore(keys.inventoryLowStock(), 'p1')).toBe(3);
  });

  it('round-trips a product including JSON specs and stock', async () => {
    const input = productInput({ id: 'p2', stock: 7 });
    await products.create(input);

    const found = await products.findById('p2');
    expect(found).toMatchObject({ id: 'p2', stock: 7, specs: input.specs, featured: false });
    expect(await products.findById('missing')).toBeNull();
  });

  it('rejects a duplicate id with 409 and leaves the original untouched', async () => {
    await products.create(productInput({ id: 'dup', name: 'Original' }));
    await expect(products.create(productInput({ id: 'dup', name: 'Copy' }))).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<HttpError>);
    expect((await products.findById('dup'))?.name).toBe('Original');
    expect(await client.sCard(keys.products())).toBe(1);
  });

  it('moves category, brand, featured and price indexes on update', async () => {
    await products.create(
      productInput({ id: 'p3', category: 'mice', brand: 'Acme', featured: true, priceCents: 500 }),
    );

    const updated = await products.update('p3', {
      category: 'monitors',
      brand: 'Globex',
      featured: false,
      priceCents: 750,
    });

    expect(updated).toMatchObject({ category: 'monitors', brandSlug: 'globex', priceCents: 750 });
    expect(await client.sIsMember(keys.productsByCategory('mice'), 'p3')).toBe(0);
    expect(await client.sIsMember(keys.productsByCategory('monitors'), 'p3')).toBe(1);
    expect(await client.sIsMember(keys.productsByBrand('acme'), 'p3')).toBe(0);
    expect(await client.sIsMember(keys.productsByBrand('globex'), 'p3')).toBe(1);
    expect(await client.sIsMember(keys.productsFeatured(), 'p3')).toBe(0);
    expect(await client.zScore(keys.productsByPrice(), 'p3')).toBe(750);
    expect(await products.update('missing', { name: 'x' })).toBeNull();
  });

  it('keeps indexes consistent when concurrent edits race', async () => {
    await products.create(productInput({ id: 'race', category: 'mice' }));
    await Promise.all([
      products.update('race', { category: 'monitors' }),
      products.update('race', { category: 'headphones' }),
      products.update('race', { category: 'pcs' }),
    ]);
    const stored = (await products.findById('race'))!.category;
    const memberships = await Promise.all(
      ['mice', 'monitors', 'headphones', 'pcs'].map((c) =>
        client.sIsMember(keys.productsByCategory(c), 'race'),
      ),
    );
    expect(memberships.reduce((a, b) => a + b, 0)).toBe(1);
    expect(await client.sIsMember(keys.productsByCategory(stored), 'race')).toBe(1);
  });

  it('removes the product from every index and inventory on delete', async () => {
    await products.create(productInput({ id: 'p4', featured: true, stock: 0 }));
    expect(await products.delete('p4')).toBe(true);
    expect(await products.delete('p4')).toBe(false);

    expect(await client.exists(keys.product('p4'))).toBe(0);
    expect(await client.sIsMember(keys.products(), 'p4')).toBe(0);
    expect(await client.sIsMember(keys.productsByCategory('mice'), 'p4')).toBe(0);
    expect(await client.sIsMember(keys.productsByBrand('acme'), 'p4')).toBe(0);
    expect(await client.sIsMember(keys.productsFeatured(), 'p4')).toBe(0);
    for (const z of [keys.productsByPrice(), keys.productsByCreated(), keys.productsBySales()]) {
      expect(await client.zScore(z, 'p4')).toBeNull();
    }
    expect(await client.hExists(keys.inventory(), 'p4')).toBe(0);
    expect(await client.zScore(keys.inventoryLowStock(), 'p4')).toBeNull();
    expect(await client.sIsMember(keys.inventoryOutOfStock(), 'p4')).toBe(0);
  });

  describe('list()', () => {
    beforeEach(async () => {
      const day = (n: number) => new Date(Date.UTC(2026, 0, n)).toISOString();
      await products.create(productInput({ id: 'a', category: 'mice', brand: 'Logitech', priceCents: 3000, stock: 5, featured: true, createdAt: day(1) })); // prettier-ignore
      await products.create(productInput({ id: 'b', category: 'mice', brand: 'Razer', priceCents: 1000, stock: 0, createdAt: day(2) })); // prettier-ignore
      await products.create(productInput({ id: 'c', category: 'monitors', brand: 'LG', priceCents: 50000, stock: 2, featured: true, createdAt: day(3) })); // prettier-ignore
      await products.create(productInput({ id: 'd', category: 'mice', brand: 'Logitech', priceCents: 2000, stock: 9, createdAt: day(4) })); // prettier-ignore
    });

    const ids = (page: { items: Array<{ id: string }> }) => page.items.map((p) => p.id);

    it('sorts by newest without filters and paginates', async () => {
      const page = await products.list({ limit: 2 });
      expect(ids(page)).toEqual(['d', 'c']);
      expect(page.total).toBe(4);
      expect(ids(await products.list({ offset: 2, limit: 2 }))).toEqual(['b', 'a']);
    });

    it('sorts by price both ways', async () => {
      expect(ids(await products.list({ sort: 'price-asc' }))).toEqual(['b', 'd', 'a', 'c']);
      expect(ids(await products.list({ sort: 'price-desc' }))).toEqual(['c', 'a', 'd', 'b']);
    });

    it('filters by category, brand (case-insensitive) and featured', async () => {
      expect(ids(await products.list({ category: 'mice', sort: 'price-asc' }))).toEqual(['b', 'd', 'a']); // prettier-ignore
      expect(ids(await products.list({ brand: 'LOGITECH', sort: 'price-asc' }))).toEqual(['d', 'a']); // prettier-ignore
      expect(ids(await products.list({ category: 'mice', featured: true }))).toEqual(['a']);
    });

    it('filters by stock and price range', async () => {
      expect(ids(await products.list({ category: 'mice', inStock: true, sort: 'price-asc' }))).toEqual(['d', 'a']); // prettier-ignore
      expect(ids(await products.list({ inStock: false }))).toEqual(['b']);
      expect(ids(await products.list({ minPriceCents: 1500, maxPriceCents: 3000, sort: 'price-asc' }))).toEqual(['d', 'a']); // prettier-ignore
      const page = await products.list({ category: 'mice', maxPriceCents: 2000, limit: 1, sort: 'price-asc' }); // prettier-ignore
      expect(ids(page)).toEqual(['b']);
      expect(page.total).toBe(2);
    });

    it('reports per-category counts from the index sets', async () => {
      const counts = await products.countByCategory();
      expect(counts.mice).toBe(3);
      expect(counts.monitors).toBe(1);
      expect(counts.laptops).toBe(0);
    });
  });
});
