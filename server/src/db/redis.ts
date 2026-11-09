import { createClient } from 'redis';
import type { AppConfig } from '../config.js';
import { logger } from '../lib/logger.js';

export type RedisClient = ReturnType<typeof createRedisClient>;

export interface RedisClientOptions {
  /** Reconnect after the connection drops. Default: true. */
  reconnect?: boolean;
  /** Attempts made before giving up on the *initial* connection. Default: 5. */
  initialConnectRetries?: number;
}

/** Socket errors such as ECONNREFUSED are AggregateErrors with an empty message. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    return error.message || code || error.name;
  }
  return String(error);
}

/**
 * Creates (but does not connect) the node-redis client used as ElectroHub's
 * primary datastore.
 *
 * - Initial connection: retried a few times, then rejected so start-up fails fast.
 * - After the first successful connection: reconnects forever with capped back-off.
 */
export function createRedisClient(
  config: AppConfig['redis'],
  { reconnect = true, initialConnectRetries = 5 }: RedisClientOptions = {},
) {
  let hasConnected = false;

  const client = createClient({
    url: config.url,
    ...(config.password ? { password: config.password } : {}),
    socket: {
      connectTimeout: 5_000,
      reconnectStrategy: (retries: number, cause: Error) => {
        if (!reconnect || (!hasConnected && retries >= initialConnectRetries)) {
          return new Error(`Unable to connect to Redis at ${config.url}: ${describeError(cause)}`);
        }
        return Math.min(2 ** retries * 100, 5_000);
      },
    },
  });

  client.on('error', (error: unknown) =>
    logger.error('[redis] client error:', describeError(error)),
  );
  client.on('reconnecting', () => logger.warn('[redis] reconnecting...'));
  client.on('ready', () => {
    hasConnected = true;
    logger.info('[redis] ready');
  });

  return client;
}

/**
 * Connects and verifies the connection with a PING so the server fails fast
 * at start-up if the database is unreachable.
 */
export async function connectRedis(client: RedisClient): Promise<void> {
  await client.connect();
  await client.ping();
}

export async function disconnectRedis(client: RedisClient): Promise<void> {
  if (client.isOpen) {
    await client.quit();
  }
}
