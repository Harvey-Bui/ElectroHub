import type { Express } from 'express';
import { buildApp } from '../../src/app.js';
import { loadConfig, type AppConfig } from '../../src/config.js';
import type { Repositories } from '../../src/repositories/index.js';
import type { ProductInput } from '../../src/schemas/product.js';
import type { Services } from '../../src/services/index.js';
import { openTestRedis, type TestRedis } from './redis.js';

export const ADMIN_USERNAME = 'test-admin';
export const ADMIN_PASSWORD = 'correct horse battery staple';

export interface TestApp {
  app: Express;
  repos: Repositories;
  services: Services;
  config: AppConfig;
  redis: TestRedis;
  /** Wipes this suite's keys and re-creates the catalogue + admin account. */
  reset: () => Promise<void>;
}

const day = (n: number) => new Date(Date.UTC(2026, 0, n, 12)).toISOString();

/** Small, fully known catalogue so assertions can be exact. */
export const CATALOG: ProductInput[] = [
  { id: 'mouse-a', name: 'Alpha Mouse', brand: 'Logitech', category: 'mice', description: 'Wireless mouse.', priceCents: 5000, stock: 10, featured: true, specs: { dpi: 26000 }, imageUrl: 'https://placehold.co/600x400/png', createdAt: day(1) },
  { id: 'mouse-b', name: 'Beta Mouse', brand: 'Razer', category: 'mice', description: 'Esports mouse.', priceCents: 3000, stock: 0, specs: {}, imageUrl: 'https://placehold.co/600x400/png', createdAt: day(2) },
  { id: 'monitor-a', name: 'Alpha Monitor', brand: 'LG', category: 'monitors', description: 'OLED monitor.', priceCents: 40000, stock: 3, featured: true, specs: { refreshHz: 240 }, imageUrl: 'https://placehold.co/600x400/png', createdAt: day(3) },
  { id: 'laptop-a', name: 'Alpha Laptop', brand: 'Lenovo', category: 'laptops', description: 'Business laptop.', priceCents: 150000, stock: 1, specs: { ramGb: 32 }, imageUrl: 'https://placehold.co/600x400/png', createdAt: day(4) },
]; // prettier-ignore

/**
 * Builds the real Express app on a real Redis connection with an isolated
 * key prefix. Returns null if Redis is unreachable (suites then skip).
 */
export async function openTestApp(
  suite: string,
  overrides: Partial<AppConfig['security']> = {},
): Promise<TestApp | null> {
  const redis = await openTestRedis(`api-${suite}`);
  if (!redis) return null;

  const base = loadConfig({ ...process.env, NODE_ENV: 'test' });
  const config: AppConfig = {
    ...base,
    corsOrigins: ['http://localhost:5173'],
    redis: { ...base.redis, keyPrefix: redis.keys.prefix },
    store: {
      lowStockThreshold: 5,
      cartTtlSeconds: 3600,
      freeShippingThresholdCents: 10000,
      shippingFlatCents: 999,
    },
    security: {
      ...base.security,
      cookieSecret: 'test-cookie-secret-that-is-long-enough-1234',
      secureCookies: false,
      loginMaxAttempts: 5,
      ...overrides,
    },
  };
  const { app, repos, services } = buildApp({ config, redis: redis.client });

  const reset = async () => {
    await redis.flush();
    for (const product of CATALOG) await repos.products.create(product);
    await services.auth.createAdmin(ADMIN_USERNAME, ADMIN_PASSWORD);
  };

  return { app, repos, services, config, redis, reset };
}

export const shippingAddress = {
  line1: '1 Infinite Loop',
  city: 'Cupertino',
  region: 'CA',
  postalCode: '95014',
  country: 'US',
};

export const checkoutPayload = {
  email: 'Shopper@Example.com',
  name: 'Sam Shopper',
  shippingAddress,
};

/** Extracts a cookie's attributes from a Set-Cookie header list. */
export function findCookie(setCookie: string[] | string | undefined, name: string) {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const raw = list.find((c) => c.startsWith(`${name}=`));
  if (!raw) return undefined;
  const attrs = raw.split(';').map((s) => s.trim().toLowerCase());
  return {
    raw,
    httpOnly: attrs.includes('httponly'),
    sameSite: attrs.find((a) => a.startsWith('samesite='))?.split('=')[1],
    path: attrs.find((a) => a.startsWith('path='))?.split('=')[1],
    cleared: attrs.some((a) => a.startsWith('expires=thu, 01 jan 1970')),
  };
}
