import type { RedisKeys } from '../db/keys.js';
import type { RedisClient } from '../db/redis.js';

/** Everything a repository needs. Built once by `createRepositories()`. */
export interface RepositoryContext {
  client: RedisClient;
  keys: RedisKeys;
  lowStockThreshold: number;
  cartTtlSeconds: number;
}

/** Formats an INCR counter value as a readable, sortable id: ("ord", 42) → "ord_000042". */
export function formatSequenceId(prefix: string, value: number): string {
  return `${prefix}_${String(value).padStart(6, '0')}`;
}

/** Redis returns `{}` from HGETALL for a missing key. */
export function isEmptyHash(hash: Record<string, string>): boolean {
  return Object.keys(hash).length === 0;
}
