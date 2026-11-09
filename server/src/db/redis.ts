import { createClient } from 'redis';
import { loadConfig, type AppConfig } from '../config.js';
import { logger } from '../lib/logger.js';

export type RedisClient = ReturnType<typeof createRedisClient>;

export interface RedisClientOptions {
  /** Reconnect after the connection drops. Default: true. */
  reconnect?: boolean;
  /** Attempts made before giving up on the *initial* connection. Default: 5. */
  initialConnectRetries?: number;
  /** Name shown in logs and in Redis `CLIENT LIST`. */
  name?: string;
}

/** Socket errors such as ECONNREFUSED are AggregateErrors with an empty message. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    return error.message || code || error.name;
  }
  return String(error);
}

/** Hides the password in a redis:// URL before it is logged. */
function redactUrl(url: string): string {
  return url.replace(/\/\/([^:@/]*):[^@/]*@/, '//$1:***@');
}

/**
 * Creates (but does not connect) a node-redis client.
 *
 * - Initial connection: retried a few times, then rejected so start-up fails fast.
 * - After the first successful connection: reconnects forever with capped
 *   exponential back-off (100 ms, 200 ms, ... up to 5 s).
 */
export function createRedisClient(
  config: AppConfig['redis'],
  { reconnect = true, initialConnectRetries = 5, name = 'electrohub' }: RedisClientOptions = {},
) {
  let hasConnected = false;
  const target = redactUrl(config.url);

  const client = createClient({
    url: config.url,
    name,
    ...(config.password ? { password: config.password } : {}),
    socket: {
      connectTimeout: 5_000,
      reconnectStrategy: (retries: number, cause: Error) => {
        if (!reconnect || (!hasConnected && retries >= initialConnectRetries)) {
          return new Error(`Unable to connect to Redis at ${target}: ${describeError(cause)}`);
        }
        const delay = Math.min(2 ** retries * 100, 5_000);
        logger.warn(`[redis:${name}] reconnect attempt ${retries + 1} in ${delay} ms`);
        return delay;
      },
    },
  });

  client.on('connect', () => logger.info(`[redis:${name}] socket connected to ${target}`));
  client.on('ready', () => {
    hasConnected = true;
    logger.info(`[redis:${name}] ready`);
  });
  client.on('end', () => logger.info(`[redis:${name}] connection closed`));
  client.on('error', (error: unknown) =>
    logger.error(`[redis:${name}] error: ${describeError(error)}`),
  );

  return client;
}

/**
 * Connects and verifies the connection with a PING so callers fail fast
 * if the database is unreachable.
 */
export async function connectRedis(client: RedisClient): Promise<void> {
  if (!client.isOpen) {
    await client.connect();
  }
  await client.ping();
}

/** Graceful close: waits for in-flight commands (QUIT), falls back to a hard close. */
export async function disconnectRedis(client: RedisClient): Promise<void> {
  if (!client.isOpen) return;
  try {
    await client.close();
  } catch (error) {
    logger.warn(`[redis] graceful close failed (${describeError(error)}), destroying socket`);
    client.destroy();
  }
}

// ---------------------------------------------------------------------------
// Shared application client
// ---------------------------------------------------------------------------

let sharedClient: RedisClient | undefined;
let connecting: Promise<RedisClient> | undefined;

/**
 * Returns the process-wide Redis client, connecting it on first use.
 * Concurrent callers share the same connection attempt.
 */
export function getRedisClient(
  config: AppConfig['redis'] = loadConfig().redis,
): Promise<RedisClient> {
  if (sharedClient?.isReady) return Promise.resolve(sharedClient);
  if (!connecting) {
    const client = createRedisClient(config);
    connecting = connectRedis(client)
      .then(() => {
        sharedClient = client;
        return client;
      })
      .catch(async (error: unknown) => {
        connecting = undefined;
        client.destroy();
        throw error;
      });
  }
  return connecting;
}

/** Closes the shared client (if it was ever opened). Safe to call more than once. */
export async function closeRedis(): Promise<void> {
  const client = sharedClient;
  sharedClient = undefined;
  connecting = undefined;
  if (client) await disconnectRedis(client);
}
