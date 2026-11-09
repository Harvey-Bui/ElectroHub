import { createHash } from 'node:crypto';
import type { RedisClient } from './redis.js';
import { KEY_NAMES as N } from './keys.js';

/**
 * Lua scripts for operations that must update a record and its indexes
 * atomically. Redis runs a script as one isolated step, so no client ever sees
 * a product that is in `products:category:laptops` but whose hash says
 * `gaming-laptops`, and concurrent stock reservations can't oversell.
 *
 * Index keys are derived inside the script from the key prefix (ARGV[1]) and
 * the record's *current* stored values. That is what makes edits safe: the
 * script removes the product from the index it is really in, not the one the
 * caller assumed. Scripts that build keys this way are fine on standalone
 * Redis (what ElectroHub uses) but would need hash tags on Redis Cluster.
 */

const SYNC_STOCK = `
local function sync_stock(p, id, stock, threshold)
  if stock <= threshold then
    redis.call('ZADD', p .. '${N.inventoryLowStock}', stock, id)
  else
    redis.call('ZREM', p .. '${N.inventoryLowStock}', id)
  end
  if stock == 0 then
    redis.call('SADD', p .. '${N.inventoryOutOfStock}', id)
  else
    redis.call('SREM', p .. '${N.inventoryOutOfStock}', id)
  end
end
`;

/** Collects ARGV[from..] (field/value pairs) into a table for HSET. */
const COLLECT_PAIRS = `
local function pairs_from(from)
  local out = {}
  for i = from, #ARGV do out[#out + 1] = ARGV[i] end
  return out
end
`;

/**
 * ARGV: prefix, id, category, brandSlug, featured(1|0), priceCents, createdAtMs,
 *       stock, lowStockThreshold, field1, value1, ...
 * Returns 1 if created, 0 if the product already exists.
 */
export const PRODUCT_CREATE = `${SYNC_STOCK}${COLLECT_PAIRS}
local p, id = ARGV[1], ARGV[2]
local key = p .. '${N.product}:' .. id
if redis.call('EXISTS', key) == 1 then return 0 end
redis.call('HSET', key, unpack(pairs_from(10)))
redis.call('SADD', p .. '${N.products}', id)
redis.call('SADD', p .. '${N.productsByCategory}:' .. ARGV[3], id)
redis.call('SADD', p .. '${N.productsByBrand}:' .. ARGV[4], id)
if ARGV[5] == '1' then redis.call('SADD', p .. '${N.productsFeatured}', id) end
redis.call('ZADD', p .. '${N.productsByPrice}', ARGV[6], id)
redis.call('ZADD', p .. '${N.productsByCreated}', ARGV[7], id)
redis.call('ZADD', p .. '${N.productsBySales}', 'NX', 0, id)
local stock = tonumber(ARGV[8])
redis.call('HSET', p .. '${N.inventory}', id, stock)
sync_stock(p, id, stock, tonumber(ARGV[9]))
return 1
`;

/**
 * ARGV: prefix, id, category, brandSlug, featured(1|0), priceCents, field1, value1, ...
 * Moves the product between category/brand/featured indexes based on the values
 * currently stored in its hash. Returns 1 if updated, 0 if it does not exist.
 */
export const PRODUCT_UPDATE = `${COLLECT_PAIRS}
local p, id = ARGV[1], ARGV[2]
local key = p .. '${N.product}:' .. id
local old = redis.call('HMGET', key, 'category', 'brandSlug')
if not old[1] then return 0 end
local category, brand = ARGV[3], ARGV[4]
if old[1] ~= category then
  redis.call('SREM', p .. '${N.productsByCategory}:' .. old[1], id)
  redis.call('SADD', p .. '${N.productsByCategory}:' .. category, id)
end
if old[2] ~= brand then
  redis.call('SREM', p .. '${N.productsByBrand}:' .. old[2], id)
  redis.call('SADD', p .. '${N.productsByBrand}:' .. brand, id)
end
if ARGV[5] == '1' then
  redis.call('SADD', p .. '${N.productsFeatured}', id)
else
  redis.call('SREM', p .. '${N.productsFeatured}', id)
end
redis.call('ZADD', p .. '${N.productsByPrice}', ARGV[6], id)
redis.call('HSET', key, unpack(pairs_from(7)))
return 1
`;

/**
 * ARGV: prefix, id. Removes the product hash and every index entry.
 * Returns 1 if deleted, 0 if it did not exist.
 */
export const PRODUCT_DELETE = `
local p, id = ARGV[1], ARGV[2]
local key = p .. '${N.product}:' .. id
local old = redis.call('HMGET', key, 'category', 'brandSlug')
if not old[1] then return 0 end
redis.call('DEL', key)
redis.call('SREM', p .. '${N.products}', id)
redis.call('SREM', p .. '${N.productsByCategory}:' .. old[1], id)
redis.call('SREM', p .. '${N.productsByBrand}:' .. old[2], id)
redis.call('SREM', p .. '${N.productsFeatured}', id)
redis.call('ZREM', p .. '${N.productsByPrice}', id)
redis.call('ZREM', p .. '${N.productsByCreated}', id)
redis.call('ZREM', p .. '${N.productsBySales}', id)
redis.call('HDEL', p .. '${N.inventory}', id)
redis.call('ZREM', p .. '${N.inventoryLowStock}', id)
redis.call('SREM', p .. '${N.inventoryOutOfStock}', id)
return 1
`;

/**
 * ARGV: prefix, id, stock, threshold.
 * Returns the new stock, or -1 if the product does not exist.
 */
export const INVENTORY_SET = `${SYNC_STOCK}
local p, id = ARGV[1], ARGV[2]
if redis.call('EXISTS', p .. '${N.product}:' .. id) == 0 then return -1 end
local stock = tonumber(ARGV[3])
redis.call('HSET', p .. '${N.inventory}', id, stock)
sync_stock(p, id, stock, tonumber(ARGV[4]))
return stock
`;

/**
 * ARGV: prefix, id, delta, threshold.
 * Returns {1, newStock} on success, {0, currentStock} if the result would be
 * negative, {-1, 0} if the product has no inventory record.
 */
export const INVENTORY_ADJUST = `${SYNC_STOCK}
local p, id = ARGV[1], ARGV[2]
local current = redis.call('HGET', p .. '${N.inventory}', id)
if not current then return {-1, 0} end
current = tonumber(current)
local next_stock = current + tonumber(ARGV[3])
if next_stock < 0 then return {0, current} end
redis.call('HSET', p .. '${N.inventory}', id, next_stock)
sync_stock(p, id, next_stock, tonumber(ARGV[4]))
return {1, next_stock}
`;

/**
 * ARGV: prefix, threshold, id1, qty1, id2, qty2, ...
 * All-or-nothing: either every line is decremented or none is.
 * Returns {1} on success or {0, failingId, available} (available = -1 if unknown product).
 */
export const INVENTORY_RESERVE = `${SYNC_STOCK}
local p, threshold = ARGV[1], tonumber(ARGV[2])
local inv = p .. '${N.inventory}'
for i = 3, #ARGV, 2 do
  local available = redis.call('HGET', inv, ARGV[i])
  if not available then return {0, ARGV[i], -1} end
  if tonumber(available) < tonumber(ARGV[i + 1]) then
    return {0, ARGV[i], tonumber(available)}
  end
end
for i = 3, #ARGV, 2 do
  local left = redis.call('HINCRBY', inv, ARGV[i], -tonumber(ARGV[i + 1]))
  sync_stock(p, ARGV[i], left, threshold)
end
return {1}
`;

/**
 * ARGV: prefix, threshold, id1, qty1, ...
 * Returns stock to inventory (e.g. a cancelled order). Products deleted in the
 * meantime are skipped. Returns the number of lines restocked.
 */
export const INVENTORY_RELEASE = `${SYNC_STOCK}
local p, threshold = ARGV[1], tonumber(ARGV[2])
local inv = p .. '${N.inventory}'
local restocked = 0
for i = 3, #ARGV, 2 do
  if redis.call('HEXISTS', inv, ARGV[i]) == 1 then
    local stock = redis.call('HINCRBY', inv, ARGV[i], tonumber(ARGV[i + 1]))
    sync_stock(p, ARGV[i], stock, threshold)
    restocked = restocked + 1
  end
end
return restocked
`;

/**
 * ARGV: prefix, id, email, field1, value1, ...
 * Claims the email first so two sign-ups can't share an address.
 * Returns 1 if created, 0 if the email is already taken.
 */
export const CUSTOMER_CREATE = `${COLLECT_PAIRS}
local p, id, email = ARGV[1], ARGV[2], ARGV[3]
if not redis.call('SET', p .. '${N.customerEmail}:' .. email, id, 'NX') then return 0 end
redis.call('HSET', p .. '${N.customer}:' .. id, unpack(pairs_from(4)))
redis.call('SADD', p .. '${N.customers}', id)
return 1
`;

/**
 * ARGV: prefix, id, newEmail ('' = unchanged), field1, value1, ...
 * Returns 1 if updated, 0 if the new email is taken, -1 if the customer does not exist.
 */
export const CUSTOMER_UPDATE = `${COLLECT_PAIRS}
local p, id, email = ARGV[1], ARGV[2], ARGV[3]
local key = p .. '${N.customer}:' .. id
local old_email = redis.call('HGET', key, 'email')
if not old_email then return -1 end
if email ~= '' and email ~= old_email then
  if not redis.call('SET', p .. '${N.customerEmail}:' .. email, id, 'NX') then return 0 end
  redis.call('DEL', p .. '${N.customerEmail}:' .. old_email)
end
if #ARGV >= 4 then redis.call('HSET', key, unpack(pairs_from(4))) end
return 1
`;

/**
 * ARGV: prefix, id. Deletes the profile, email lookup and cart.
 * Order history is kept for accounting. Returns 1 if deleted, 0 if not found.
 */
export const CUSTOMER_DELETE = `
local p, id = ARGV[1], ARGV[2]
local key = p .. '${N.customer}:' .. id
local email = redis.call('HGET', key, 'email')
if not email then return 0 end
redis.call('DEL', key, p .. '${N.customerEmail}:' .. email, p .. '${N.cart}:' .. id)
redis.call('SREM', p .. '${N.customers}', id)
return 1
`;

/**
 * ARGV: prefix, id, newStatus, updatedAt, allowedFrom1, allowedFrom2, ...
 * Moves the order between orders:status:* sets only if its current status is
 * one of the allowed sources. Returns {1, oldStatus}, {0, oldStatus} if the
 * transition is not allowed, or {-1, ''} if the order does not exist.
 *
 * Moving to 'cancelled' also reverses the order's effect on the revenue
 * counter and the best-seller ranking, in the same atomic step, so two
 * concurrent cancellations can't subtract twice.
 */
export const ORDER_SET_STATUS = `
local p, id, status = ARGV[1], ARGV[2], ARGV[3]
local key = p .. '${N.order}:' .. id
local old = redis.call('HGET', key, 'status')
if not old then return {-1, ''} end
local allowed = false
for i = 5, #ARGV do if ARGV[i] == old then allowed = true end end
if not allowed then return {0, old} end
redis.call('SMOVE', p .. '${N.ordersByStatus}:' .. old, p .. '${N.ordersByStatus}:' .. status, id)
redis.call('HSET', key, 'status', status, 'updatedAt', ARGV[4])
if status == 'cancelled' then
  local total = tonumber(redis.call('HGET', key, 'totalCents') or '0')
  redis.call('DECRBY', p .. '${N.statsRevenue}', total)
  local items = cjson.decode(redis.call('HGET', key, 'items') or '[]')
  local sales = p .. '${N.productsBySales}'
  for _, item in ipairs(items) do
    if redis.call('ZSCORE', sales, item.productId) then
      redis.call('ZINCRBY', sales, -item.quantity, item.productId)
    end
  end
end
return {1, old}
`;

// ---------------------------------------------------------------------------

const shaCache = new Map<string, string>();
const sha1 = (script: string) => {
  let sha = shaCache.get(script);
  if (!sha) {
    sha = createHash('sha1').update(script).digest('hex');
    shaCache.set(script, sha);
  }
  return sha;
};

/**
 * Runs a script with EVALSHA (Redis keeps compiled scripts in its cache) and
 * falls back to EVAL once if Redis answers NOSCRIPT (first run, or after a restart).
 */
export async function runScript(
  client: RedisClient,
  script: string,
  args: Array<string | number>,
): Promise<unknown> {
  const options = { arguments: args.map(String) };
  try {
    return await client.evalSha(sha1(script), options);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('NOSCRIPT')) {
      return client.eval(script, options);
    }
    throw error;
  }
}
