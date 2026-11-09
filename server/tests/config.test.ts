import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { createKeys } from '../src/db/keys.js';

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
    expect(keys.inventory('p1')).toBe('eh:inventory:p1');
    expect(keys.cart('c1')).toBe('eh:cart:c1');
    expect(keys.orderItems('o1')).toBe('eh:order:o1:items');
    expect(keys.productsByCategory('laptops')).toBe('eh:products:category:laptops');
  });
});
