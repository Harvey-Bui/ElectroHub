import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openTestApp } from '../helpers/api.js';

const t = await openTestApp('products');

describe.skipIf(!t)('Product & category endpoints', () => {
  const api = () => request(t!.app);
  const ids = (res: request.Response) => (res.body.data as Array<{ id: string }>).map((p) => p.id);

  beforeAll(async () => {
    await t!.reset();
  });
  afterAll(async () => {
    await t!.redis.close();
  });

  describe('GET /api/products', () => {
    it('lists newest first with pagination metadata', async () => {
      const res = await api().get('/api/products');

      expect(res.status).toBe(200);
      expect(ids(res)).toEqual(['laptop-a', 'monitor-a', 'mouse-b', 'mouse-a']);
      expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 4, totalPages: 1 });
      expect(res.body.data[0]).toMatchObject({
        id: 'laptop-a',
        name: 'Alpha Laptop',
        priceCents: 150000,
        stock: 1,
        specs: { ramGb: 32 },
      });
    });

    it('paginates', async () => {
      const res = await api().get('/api/products?page=2&limit=3');
      expect(ids(res)).toEqual(['mouse-a']);
      expect(res.body.pagination).toEqual({ page: 2, limit: 3, total: 4, totalPages: 2 });
    });

    it('sorts by price ascending and descending', async () => {
      expect(ids(await api().get('/api/products?sort=price-asc'))).toEqual([
        'mouse-b',
        'mouse-a',
        'monitor-a',
        'laptop-a',
      ]);
      expect(ids(await api().get('/api/products?sort=price-desc'))).toEqual([
        'laptop-a',
        'monitor-a',
        'mouse-a',
        'mouse-b',
      ]);
    });

    it('filters by category, brand (case-insensitive), price range and stock', async () => {
      expect(ids(await api().get('/api/products?category=mice&sort=price-asc'))).toEqual([
        'mouse-b',
        'mouse-a',
      ]);
      expect(ids(await api().get('/api/products?brand=logitech'))).toEqual(['mouse-a']);
      expect(
        ids(await api().get('/api/products?minPriceCents=4000&maxPriceCents=50000&sort=price-asc')),
      ).toEqual(['mouse-a', 'monitor-a']);
      expect(ids(await api().get('/api/products?category=mice&inStock=true'))).toEqual(['mouse-a']);
      expect(ids(await api().get('/api/products?inStock=false'))).toEqual(['mouse-b']);
    });

    it.each([
      ['sort=cheapest', 'sort'],
      ['minPriceCents=-5', 'minPriceCents'],
      ['minPriceCents=900&maxPriceCents=100', 'minPriceCents'],
      ['category=toasters', 'category'],
      ['inStock=maybe', 'inStock'],
      ['limit=1000', 'limit'],
      ['page=0', 'page'],
    ])('rejects invalid query %s with 400 VALIDATION_ERROR', async (query, field) => {
      const res = await api().get(`/api/products?${query}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toBe('Request validation failed');
      expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain(field);
    });
  });

  describe('GET /api/products/:id', () => {
    it('returns one product', async () => {
      const res = await api().get('/api/products/monitor-a');
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: 'monitor-a', category: 'monitors', stock: 3 });
    });

    it('returns 404 PRODUCT_NOT_FOUND for unknown ids', async () => {
      const res = await api().get('/api/products/nope');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product "nope" not found' },
      });
    });

    it('returns 400 for malformed ids', async () => {
      const res = await api().get('/api/products/bad:id');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/products/category/:category', () => {
    it('lists only that category and supports the same filters', async () => {
      const res = await api().get('/api/products/category/mice?sort=price-desc');
      expect(res.status).toBe(200);
      expect(ids(res)).toEqual(['mouse-a', 'mouse-b']);

      const inStock = await api().get('/api/products/category/mice?inStock=true');
      expect(ids(inStock)).toEqual(['mouse-a']);
    });

    it('ignores a conflicting ?category= in the query string', async () => {
      const res = await api().get('/api/products/category/monitors?category=mice');
      expect(ids(res)).toEqual(['monitor-a']);
    });

    it('returns an empty page for a known category with no products', async () => {
      const res = await api().get('/api/products/category/microphones');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    it('returns 404 CATEGORY_NOT_FOUND for unknown categories', async () => {
      const res = await api().get('/api/products/category/toasters');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });
  });

  describe('GET /api/products/featured', () => {
    it('returns featured products, newest first', async () => {
      const res = await api().get('/api/products/featured');
      expect(res.status).toBe(200);
      expect(ids(res)).toEqual(['monitor-a', 'mouse-a']);
      expect(ids(await api().get('/api/products/featured?limit=1'))).toEqual(['monitor-a']);
    });
  });

  describe('GET /api/categories', () => {
    it('returns all 7 categories with live product counts', async () => {
      const res = await api().get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(7);
      const counts = Object.fromEntries(
        res.body.data.map((c: { slug: string; productCount: number }) => [c.slug, c.productCount]),
      );
      expect(counts).toEqual({
        'gaming-laptops': 0,
        laptops: 1,
        pcs: 0,
        mice: 2,
        monitors: 1,
        headphones: 0,
        microphones: 0,
      });
      expect(res.body.data[0]).toMatchObject({ slug: 'gaming-laptops', name: 'Gaming Laptops' });
    });
  });
});
