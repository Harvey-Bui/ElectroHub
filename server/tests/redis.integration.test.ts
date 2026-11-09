import { afterAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { createKeys } from '../src/db/keys.js';
import { connectRedis, createRedisClient, disconnectRedis } from '../src/db/redis.js';

/**
 * Runs against a real Redis (e.g. `docker compose up -d redis`).
 * Skipped automatically when Redis is unreachable so unit tests still pass offline.
 * Set REQUIRE_REDIS=1 (e.g. in CI) to turn a missing Redis into a failure.
 */
const config = loadConfig();
// Fail fast instead of retrying forever when probing availability
const client = createRedisClient(config.redis, { reconnect: false });

let available = false;
try {
  await connectRedis(client);
  available = true;
} catch {
  if (process.env.REQUIRE_REDIS === '1') {
    throw new Error(`REQUIRE_REDIS=1 but Redis is not reachable at ${config.redis.url}`);
  }
}

const keys = createKeys(`${config.redis.keyPrefix}test:${process.pid}:`);

afterAll(async () => {
  if (available) {
    const leftovers = await client.keys(`${config.redis.keyPrefix}test:${process.pid}:*`);
    if (leftovers.length) await client.del(leftovers);
  }
  await disconnectRedis(client);
});

describe.skipIf(!available)('Redis integration', () => {
  it('round-trips a product hash', async () => {
    const key = keys.product('it-1');
    await client.hSet(key, { name: 'Test Phone', priceCents: '19999' });

    expect(await client.hGetAll(key)).toEqual({ name: 'Test Phone', priceCents: '19999' });
  });

  it('decrements inventory atomically', async () => {
    const key = keys.inventory('it-1');
    await client.set(key, 5);
    const results = await Promise.all([client.decrBy(key, 2), client.decrBy(key, 2)]);

    expect(results.sort()).toEqual([1, 3]);
    expect(await client.get(key)).toBe('1');
  });
});
