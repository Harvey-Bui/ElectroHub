import type { RedisKeys } from './keys.js';
import type { RedisClient } from './redis.js';

export const SCHEMA_VERSION = '1';

export interface SetupReport {
  ping: string;
  redisVersion: string;
  aofEnabled: boolean;
  appendfsync: string;
  rdbSavePolicy: string;
  lastRdbSave: string | null;
  schemaVersion: string;
  schemaVersionWritten: boolean;
  warnings: string[];
}

function infoField(info: string, field: string): string | undefined {
  return info.match(new RegExp(`^${field}:(.*)$`, 'm'))?.[1]?.trim();
}

/**
 * Checks that the Redis instance is fit to be the system of record
 * (reachable, AOF persistence on) and records the data-model version.
 * Safe to run any number of times.
 */
export async function setupDatabase(client: RedisClient, keys: RedisKeys): Promise<SetupReport> {
  const ping = await client.ping();
  const [server, persistence, config] = await Promise.all([
    client.info('server'),
    client.info('persistence'),
    client.configGet(['appendonly', 'appendfsync', 'save']),
  ]);

  const written =
    (await client.set(keys.schemaVersion(), SCHEMA_VERSION, { condition: 'NX' })) === 'OK';
  const schemaVersion = (await client.get(keys.schemaVersion())) ?? SCHEMA_VERSION;

  const aofEnabled = infoField(persistence, 'aof_enabled') === '1';
  const lastSave = Number(infoField(persistence, 'rdb_last_save_time'));
  const warnings: string[] = [];
  if (!aofEnabled) {
    warnings.push(
      'AOF persistence is OFF: writes since the last RDB snapshot are lost on restart. ' +
        'Start Redis with `docker compose up -d redis` (appendonly yes).',
    );
  }
  if (schemaVersion !== SCHEMA_VERSION) {
    warnings.push(
      `Stored schema version ${schemaVersion} differs from code version ${SCHEMA_VERSION}.`,
    );
  }

  return {
    ping,
    redisVersion: infoField(server, 'redis_version') ?? 'unknown',
    aofEnabled,
    appendfsync: config.appendfsync ?? 'unknown',
    rdbSavePolicy: config.save ?? '',
    lastRdbSave: lastSave > 0 ? new Date(lastSave * 1000).toISOString() : null,
    schemaVersion,
    schemaVersionWritten: written,
    warnings,
  };
}

/** Deletes every key under the prefix using incremental SCAN + UNLINK (admin use only). */
export async function resetDatabase(client: RedisClient, prefix: string): Promise<number> {
  let deleted = 0;
  for await (const batch of client.scanIterator({ MATCH: `${prefix}*`, COUNT: 500 })) {
    if (batch.length > 0) deleted += await client.unlink(batch);
  }
  return deleted;
}
