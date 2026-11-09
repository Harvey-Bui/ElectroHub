/* eslint-disable no-console */
/**
 * npm run db:reset -- --yes
 * Deletes every ElectroHub key (only keys under REDIS_KEY_PREFIX). Development only.
 */
import { loadConfig } from '../src/config.js';
import { closeRedis, describeError, getRedisClient } from '../src/db/redis.js';
import { resetDatabase } from '../src/db/setup.js';

async function main() {
  const config = loadConfig();
  if (config.env === 'production') {
    throw new Error('Refusing to reset the database when NODE_ENV=production');
  }
  if (!process.argv.includes('--yes')) {
    console.log(
      `This deletes every key matching "${config.redis.keyPrefix}*".\n` +
        'Re-run with: npm run db:reset -- --yes',
    );
    return;
  }
  const client = await getRedisClient(config.redis);
  const deleted = await resetDatabase(client, config.redis.keyPrefix);
  console.log(`Deleted ${deleted} keys with prefix "${config.redis.keyPrefix}".`);
}

main()
  .catch((error: unknown) => {
    console.error(`db:reset failed: ${describeError(error)}`);
    process.exitCode = 1;
  })
  .finally(closeRedis);
