/* eslint-disable no-console */
/**
 * npm run db:seed [-- --reset-stock]
 * Idempotently loads the catalogue (21 products) and demo customers, then
 * prints what changed and the resulting index sizes.
 */
import { loadConfig } from '../src/config.js';
import { createKeys } from '../src/db/keys.js';
import { closeRedis, describeError, getRedisClient } from '../src/db/redis.js';
import { seedDatabase } from '../src/db/seed/index.js';
import { setupDatabase } from '../src/db/setup.js';
import { createRepositories } from '../src/repositories/index.js';

const resetStock = process.argv.includes('--reset-stock');
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const row = (label: string, value: string | number) => console.log(`  ${label.padEnd(36)}${value}`);

async function main() {
  const config = loadConfig();
  const client = await getRedisClient(config.redis);
  await setupDatabase(client, createKeys(config.redis.keyPrefix));
  const repos = createRepositories(client, config);

  const started = performance.now();
  const summary = await seedDatabase(repos, { resetStock });
  const elapsed = Math.round(performance.now() - started);

  const [productCount, byCategory, inventory, lowStock, outOfStock, customerCount] =
    await Promise.all([
      repos.products.count(),
      repos.products.countByCategory(),
      repos.inventory.summary(),
      repos.inventory.lowStock(),
      repos.inventory.outOfStock(),
      repos.customers.count(),
    ]);
  const lowStockProducts = await repos.products.findByIds(lowStock.map((l) => l.productId));

  const p = summary.products;
  console.log(`\nElectroHub seed (${elapsed} ms, prefix "${config.redis.keyPrefix}")`);
  console.log('─'.repeat(60));
  console.log(
    `Products   inserted ${p.inserted.length}, updated ${p.updated.length}, ` +
      `unchanged ${p.unchanged.length}` +
      (resetStock ? `, stock reset ${p.stockReset.length}` : ''),
  );
  console.log(
    `Customers  inserted ${summary.customers.inserted.length}, ` +
      `already present ${summary.customers.existing.length}`,
  );

  console.log('\nIndex sizes');
  row('products', productCount);
  for (const [category, count] of Object.entries(byCategory)) {
    row(`products:category:${category}`, count);
  }
  row('customers', customerCount);

  console.log('\nInventory');
  row('inventory (tracked products)', inventory.trackedProducts);
  row('total units in stock', inventory.totalUnits);
  row(`inventory:low-stock (stock ≤ ${inventory.lowStockThreshold})`, inventory.lowStock);
  row('inventory:out-of-stock', `${inventory.outOfStock} ${JSON.stringify(outOfStock)}`);

  console.log('\nLow-stock ranking (inventory:low-stock, lowest first)');
  for (const product of lowStockProducts) {
    console.log(
      `  ${String(product.stock).padStart(2)}  ${product.name.padEnd(36)} ${money(product.priceCents)}`,
    );
  }
  if (p.inserted.length === 0 && p.updated.length === 0) {
    console.log('\nNothing to insert: the catalogue was already seeded (no duplicates created).');
  }
}

main()
  .catch((error: unknown) => {
    console.error(`db:seed failed: ${describeError(error)}`);
    process.exitCode = 1;
  })
  .finally(closeRedis);
