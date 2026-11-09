import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { createKeys, slugify } from '../src/db/keys.js';

describe('loadConfig', () => {
  it('applies defaults when variables are missing', () => {
    const config = loadConfig({});

    expect(config.port).toBe(4000);
    expect(config.env).toBe('development');
    expect(config.redis.url).toBe('redis://localhost:6379');
    expect(config.redis.password).toBeUndefined();
    expect(config.redis.keyPrefix).toBe('electrohub:');
    expect(config.corsOrigins).toEqual(['http://localhost:5173']);
  });

  it('parses comma-separated CORS origins and numeric ports', () => {
    const config = loadConfig({
      PORT: '8080',
      CORS_ORIGIN: 'http://a.test, http://b.test',
      REDIS_PASSWORD: 'secret',
    });

    expect(config.port).toBe(8080);
    expect(config.corsOrigins).toEqual(['http://a.test', 'http://b.test']);
    expect(config.redis.password).toBe('secret');
  });

  it('treats an empty REDIS_PASSWORD as no password', () => {
    expect(loadConfig({ REDIS_PASSWORD: '' }).redis.password).toBeUndefined();
  });

  it('throws a descriptive error for invalid values', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadConfig({ REDIS_URL: 'not a url' })).toThrow(/REDIS_URL/);
  });
});

describe('createKeys', () => {
  it('namespaces every key with the configured prefix', () => {
    const keys = createKeys('eh:');

    expect(keys.product('p1')).toBe('eh:product:p1');
    expect(keys.products()).toBe('eh:products');
    expect(keys.productsByCategory('laptops')).toBe('eh:products:category:laptops');
    expect(keys.productsByBrand('asus')).toBe('eh:products:brand:asus');
    expect(keys.inventory()).toBe('eh:inventory');
    expect(keys.inventoryLowStock()).toBe('eh:inventory:low-stock');
    expect(keys.customer('cus_000001')).toBe('eh:customer:cus_000001');
    expect(keys.customerEmail('Ann@Example.com')).toBe('eh:customer:email:ann@example.com');
    expect(keys.cart('cus_000001')).toBe('eh:cart:cus_000001');
    expect(keys.order('ord_000001')).toBe('eh:order:ord_000001');
    expect(keys.ordersByCustomer('cus_000001')).toBe('eh:orders:customer:cus_000001');
    expect(keys.ordersByStatus('paid')).toBe('eh:orders:status:paid');
    expect(keys.counterOrder()).toBe('eh:counter:order');
  });
});

describe('slugify', () => {
  it('builds brand index slugs', () => {
    expect(slugify('Western Digital')).toBe('western-digital');
    expect(slugify('RØDE')).toBe('rode');
    expect(slugify('Café Électrique')).toBe('cafe-electrique');
    expect(slugify('  ASUS ROG ')).toBe('asus-rog');
  });
});
