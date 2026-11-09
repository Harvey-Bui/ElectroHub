/* eslint-disable no-console */
/**
 * npm run db:setup
 * Verifies the Redis connection and persistence settings, and records the
 * data-model version. Safe to run repeatedly.
 */
import { loadConfig } from '../src/config.js';
import { createKeys } from '../src/db/keys.js';
import { closeRedis, describeError, getRedisClient } from '../src/db/redis.js';
import { setupDatabase } from '../src/db/setup.js';

async function main() {
  const config = loadConfig();
  const client = await getRedisClient(config.redis);
  const report = await setupDatabase(client, createKeys(config.redis.keyPrefix));

  console.log('\nElectroHub database setup');
  console.log('─'.repeat(40));
  console.log(`PING              ${report.ping}`);
  console.log(`Redis version     ${report.redisVersion}`);
  console.log(`AOF enabled       ${report.aofEnabled ? 'yes' : 'NO'}`);
  console.log(`appendfsync       ${report.appendfsync}`);
  console.log(`RDB save policy   ${report.rdbSavePolicy || '(disabled)'}`);
  console.log(`Last RDB save     ${report.lastRdbSave ?? 'never'}`);
  console.log(`Key prefix        ${config.redis.keyPrefix}`);
  console.log(
    `Schema version    ${report.schemaVersion}${report.schemaVersionWritten ? ' (written)' : ''}`,
  );
  for (const warning of report.warnings) console.warn(`\nWARNING: ${warning}`);
  console.log('\nNext: npm run db:seed');
  if (report.warnings.length > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(`db:setup failed: ${describeError(error)}`);
    process.exitCode = 1;
  })
  .finally(closeRedis);
