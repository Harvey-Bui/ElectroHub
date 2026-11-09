import type { Repositories } from '../../repositories/index.js';
import type { Product, ProductInput } from '../../schemas/product.js';
import { SEED_CUSTOMERS } from './customers.js';
import { SEED_PRODUCTS } from './products.js';

export interface SeedOptions {
  /** Also reset stock of existing products to the seed values. Default false (keeps live stock). */
  resetStock?: boolean;
  products?: readonly ProductInput[];
}

export interface SeedSummary {
  products: { inserted: string[]; updated: string[]; unchanged: string[]; stockReset: string[] };
  customers: { inserted: string[]; existing: string[] };
}

/** True if the stored product already matches the seed definition (ignoring stock and timestamps). */
function matchesSeed(stored: Product, seed: ProductInput): boolean {
  return (
    stored.name === seed.name &&
    stored.brand === seed.brand &&
    stored.category === seed.category &&
    stored.description === seed.description &&
    stored.priceCents === seed.priceCents &&
    stored.imageUrl === seed.imageUrl &&
    stored.featured === (seed.featured ?? false) &&
    JSON.stringify(stored.specs) === JSON.stringify(seed.specs ?? {})
  );
}

/**
 * Idempotent seed. Products are upserted by their stable id through the
 * repositories, so indexes are maintained exactly as in normal operation.
 * Re-running never duplicates anything and, by default, keeps current stock.
 */
export async function seedDatabase(
  repos: Repositories,
  { resetStock = false, products = SEED_PRODUCTS }: SeedOptions = {},
): Promise<SeedSummary> {
  const summary: SeedSummary = {
    products: { inserted: [], updated: [], unchanged: [], stockReset: [] },
    customers: { inserted: [], existing: [] },
  };

  for (const seed of products) {
    const existing = await repos.products.findById(seed.id);
    if (!existing) {
      await repos.products.create(seed);
      summary.products.inserted.push(seed.id);
      continue;
    }

    if (matchesSeed(existing, seed)) {
      summary.products.unchanged.push(seed.id);
    } else {
      const { id: _id, stock: _stock, createdAt: _createdAt, ...fields } = seed;
      await repos.products.update(seed.id, fields);
      summary.products.updated.push(seed.id);
    }

    if (resetStock && existing.stock !== seed.stock) {
      await repos.inventory.setStock(seed.id, seed.stock);
      summary.products.stockReset.push(seed.id);
    }
  }

  for (const customer of SEED_CUSTOMERS) {
    const existing = await repos.customers.findByEmail(customer.email);
    if (existing) {
      summary.customers.existing.push(existing.id);
    } else {
      const created = await repos.customers.create(customer);
      summary.customers.inserted.push(created.id);
    }
  }

  return summary;
}

export { SEED_CUSTOMERS, SEED_PRODUCTS };
