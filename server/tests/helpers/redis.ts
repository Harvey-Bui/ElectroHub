import { loadConfig } from '../../src/config.js';
import { createKeys, type RedisKeys } from '../../src/db/keys.js';
import {
  connectRedis,
  createRedisClient,
  disconnectRedis,
  type RedisClient,
} from '../../src/db/redis.js';
import { resetDatabase } from '../../src/db/setup.js';
import { createRepositories, type Repositories } from '../../src/repositories/index.js';

export interface TestRedis {
  client: RedisClient;
  keys: RedisKeys;
  repos: Repositories;
  /** Deletes every key written by this test file. */
  flush: () => Promise<number>;
  close: () => Promise<void>;
}

export const TEST_LOW_STOCK_THRESHOLD = 5;
export const TEST_CART_TTL_SECONDS = 3600;

/**
 * Connects to the real Redis from .env with an isolated key prefix
 * (`electrohub:test:{suite}:{pid}:`), so tests never touch seeded data.
 * Returns null when Redis is unreachable so suites can `describe.skipIf(!redis)`.
 * Set REQUIRE_REDIS=1 to turn that into a failure (e.g. in CI).
 */
export async function openTestRedis(suite: string): Promise<TestRedis | null> {
  const config = loadConfig();
  const client = createRedisClient(config.redis, { reconnect: false, name: `test-${suite}` });
  try {
    await connectRedis(client);
  } catch (error) {
    client.destroy();
    if (process.env.REQUIRE_REDIS === '1') throw error;
    return null;
  }

  const prefix = `${config.redis.keyPrefix}test:${suite}:${process.pid}:`;
  const repos = createRepositories(client, {
    redis: { ...config.redis, keyPrefix: prefix },
    store: { lowStockThreshold: TEST_LOW_STOCK_THRESHOLD, cartTtlSeconds: TEST_CART_TTL_SECONDS },
  });

  return {
    client,
    keys: createKeys(prefix),
    repos,
    flush: () => resetDatabase(client, prefix),
    close: async () => {
      await resetDatabase(client, prefix);
      await disconnectRedis(client);
    },
  };
}
