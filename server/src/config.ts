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

const envSchema = z.object({
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
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_PASSWORD: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  REDIS_KEY_PREFIX: z.string().min(1).default('electrohub:'),
  LOW_STOCK_THRESHOLD: z.coerce.number().int().min(0).default(5),
  CART_TTL_DAYS: z.coerce.number().int().min(1).default(30),
});

export type AppConfig = {
  env: 'development' | 'test' | 'production';
  port: number;
  corsOrigins: string[];
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
    redis: {
      url: env.REDIS_URL,
      password: env.REDIS_PASSWORD,
      keyPrefix: env.REDIS_KEY_PREFIX,
    },
    store: {
      lowStockThreshold: env.LOW_STOCK_THRESHOLD,
      cartTtlSeconds: env.CART_TTL_DAYS * 24 * 60 * 60,
    },
  };
}
