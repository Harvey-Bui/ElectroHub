import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load `server/.env` first (if present), then the shared repository-root `.env`.
// Values already present in process.env always win.
dotenv.config({
  path: [path.join(serverRoot, '.env'), path.join(serverRoot, '..', '.env')],
  quiet: true,
});

/**
 * Used only outside production when COOKIE_SECRET is unset, so local development
 * works out of the box. Production refuses to start without a real secret.
 */
const DEV_COOKIE_SECRET = 'electrohub-dev-only-cookie-secret-do-not-use-in-production';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    CORS_ORIGIN: z
      .string()
      .default('http://localhost:5173')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    REDIS_PASSWORD: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined)),
    REDIS_KEY_PREFIX: z.string().min(1).default('electrohub:'),
    LOW_STOCK_THRESHOLD: z.coerce.number().int().min(0).default(5),
    CART_TTL_DAYS: z.coerce.number().int().min(1).default(30),
    FREE_SHIPPING_THRESHOLD_CENTS: z.coerce.number().int().min(0).default(10000),
    SHIPPING_FLAT_CENTS: z.coerce.number().int().min(0).default(999),
    COOKIE_SECRET: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined)),
    ADMIN_SESSION_TTL_HOURS: z.coerce.number().min(0.25).max(168).default(8),
    ADMIN_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
    ADMIN_LOGIN_WINDOW_MINUTES: z.coerce.number().int().min(1).default(15),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && (!env.COOKIE_SECRET || env.COOKIE_SECRET.length < 32)) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECRET'],
        message: 'must be set to at least 32 random characters in production',
      });
    }
  });

export type AppConfig = {
  env: 'development' | 'test' | 'production';
  port: number;
  corsOrigins: string[];
  /** Honour X-Forwarded-* headers (set when running behind a reverse proxy). */
  trustProxy: boolean;
  redis: {
    url: string;
    password: string | undefined;
    keyPrefix: string;
  };
  store: {
    /** Products with stock at or below this value appear in the low-stock ranking. */
    lowStockThreshold: number;
    /** Idle carts expire after this many days. */
    cartTtlSeconds: number;
    /** Orders with a subtotal at or above this ship free. */
    freeShippingThresholdCents: number;
    shippingFlatCents: number;
  };
  security: {
    cookieSecret: string;
    /** Send cookies with the Secure flag (HTTPS only). On in production. */
    secureCookies: boolean;
    adminSessionTtlSeconds: number;
    loginMaxAttempts: number;
    loginWindowSeconds: number;
  };
};

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const env = parsed.data;
  return {
    env: env.NODE_ENV,
    port: env.PORT,
    corsOrigins: env.CORS_ORIGIN,
    trustProxy: env.TRUST_PROXY,
    redis: {
      url: env.REDIS_URL,
      password: env.REDIS_PASSWORD,
      keyPrefix: env.REDIS_KEY_PREFIX,
    },
    store: {
      lowStockThreshold: env.LOW_STOCK_THRESHOLD,
      cartTtlSeconds: env.CART_TTL_DAYS * 24 * 60 * 60,
      freeShippingThresholdCents: env.FREE_SHIPPING_THRESHOLD_CENTS,
      shippingFlatCents: env.SHIPPING_FLAT_CENTS,
    },
    security: {
      cookieSecret: env.COOKIE_SECRET ?? DEV_COOKIE_SECRET,
      secureCookies: env.NODE_ENV === 'production',
      adminSessionTtlSeconds: Math.round(env.ADMIN_SESSION_TTL_HOURS * 3600),
      loginMaxAttempts: env.ADMIN_LOGIN_MAX_ATTEMPTS,
      loginWindowSeconds: env.ADMIN_LOGIN_WINDOW_MINUTES * 60,
    },
  };
}
