import { slugify } from '../db/keys.js';
import { PRODUCT_CREATE, PRODUCT_DELETE, PRODUCT_UPDATE, runScript } from '../db/scripts.js';
import { HttpError } from '../lib/httpError.js';
import {
  CATEGORIES,
  productInputSchema,
  productQuerySchema,
  productUpdateSchema,
  type Category,
  type Product,
  type ProductInput,
  type ProductQuery,
  type ProductSort,
  type ProductUpdate,
} from '../schemas/product.js';
import { isEmptyHash, type RepositoryContext } from './context.js';

export interface ProductPage {
  items: Product[];
  total: number;
  offset: number;
  limit: number;
}

/** Fields written to the product hash (stock lives in the `inventory` hash). */
type ProductRecord = Omit<Product, 'stock'>;

function toHashPairs(record: ProductRecord): string[] {
  return [
    'id', record.id,
    'name', record.name,
    'brand', record.brand,
    'brandSlug', record.brandSlug,
    'category', record.category,
    'description', record.description,
    'priceCents', String(record.priceCents),
    'specs', JSON.stringify(record.specs),
    'imageUrl', record.imageUrl,
    'featured', record.featured ? '1' : '0',
    'createdAt', record.createdAt,
    'updatedAt', record.updatedAt,
  ]; // prettier-ignore
}

function fromHash(hash: Record<string, string>, stock: number): Product {
  return {
    id: hash.id!,
    name: hash.name!,
    brand: hash.brand!,
    brandSlug: hash.brandSlug!,
    category: hash.category as Category,
    description: hash.description!,
    priceCents: Number(hash.priceCents),
    stock,
    specs: JSON.parse(hash.specs ?? '{}') as Product['specs'],
    imageUrl: hash.imageUrl!,
    featured: hash.featured === '1',
    createdAt: hash.createdAt!,
    updatedAt: hash.updatedAt!,
  };
}

export class ProductRepository {
  constructor(private readonly ctx: RepositoryContext) {}

  private get client() {
    return this.ctx.client;
  }

  private get keys() {
    return this.ctx.keys;
  }

  private sortKey(sort: ProductSort): string {
    switch (sort) {
      case 'newest':
        return this.keys.productsByCreated();
      case 'best-selling':
        return this.keys.productsBySales();
      case 'price-asc':
      case 'price-desc':
        return this.keys.productsByPrice();
    }
  }

  /**
   * Creates a product with its initial stock and every index, atomically.
   * Throws 409 if the id is already used.
   */
  async create(input: ProductInput): Promise<Product> {
    const data = productInputSchema.parse(input);
    const now = new Date().toISOString();
    const createdAt = data.createdAt ?? now;
    const record: ProductRecord = {
      id: data.id,
      name: data.name,
      brand: data.brand,
      brandSlug: slugify(data.brand),
      category: data.category,
      description: data.description,
      priceCents: data.priceCents,
      specs: data.specs,
      imageUrl: data.imageUrl,
      featured: data.featured,
      createdAt,
      updatedAt: now,
    };

    const created = await runScript(this.client, PRODUCT_CREATE, [
      this.keys.prefix,
      record.id,
      record.category,
      record.brandSlug,
      record.featured ? '1' : '0',
      record.priceCents,
      Date.parse(createdAt),
      data.stock,
      this.ctx.lowStockThreshold,
      ...toHashPairs(record),
    ]);
    if (created !== 1) {
      throw HttpError.conflict(
        `Product "${record.id}" already exists`,
        undefined,
        'PRODUCT_EXISTS',
      );
    }
    return { ...record, stock: data.stock };
  }

  async exists(id: string): Promise<boolean> {
    return (await this.client.exists(this.keys.product(id))) === 1;
  }

  async findById(id: string): Promise<Product | null> {
    const [hash, stock] = await Promise.all([
      this.client.hGetAll(this.keys.product(id)),
      this.client.hGet(this.keys.inventory(), id),
    ]);
    return isEmptyHash(hash) ? null : fromHash(hash, Number(stock ?? 0));
  }

  /** Loads many products in one round trip; keeps the requested order and skips missing ids. */
  async findByIds(ids: readonly string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const [hashes, stocks] = await Promise.all([
      Promise.all(ids.map((id) => this.client.hGetAll(this.keys.product(id)))),
      this.client.hmGet(this.keys.inventory(), [...ids]),
    ]);
    const products: Product[] = [];
    hashes.forEach((hash, i) => {
      if (!isEmptyHash(hash)) products.push(fromHash(hash, Number(stocks[i] ?? 0)));
    });
    return products;
  }

  /**
   * Applies a partial update. Category, brand, featured and price indexes are
   * moved inside a Lua script based on the values actually stored, so they stay
   * consistent even if two edits race. Returns null if the product does not exist.
   */
  async update(id: string, patch: ProductUpdate): Promise<Product | null> {
    const changes = productUpdateSchema.parse(patch);
    const current = await this.findById(id);
    if (!current) return null;

    const { stock, ...base } = current;
    const record: ProductRecord = {
      ...base,
      ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)),
      updatedAt: new Date().toISOString(),
    };
    record.brandSlug = slugify(record.brand);

    const updated = await runScript(this.client, PRODUCT_UPDATE, [
      this.keys.prefix,
      id,
      record.category,
      record.brandSlug,
      record.featured ? '1' : '0',
      record.priceCents,
      ...toHashPairs(record),
    ]);
    return updated === 1 ? { ...record, stock } : null;
  }

  /** Deletes the product, its inventory record and all index entries. */
  async delete(id: string): Promise<boolean> {
    return (await runScript(this.client, PRODUCT_DELETE, [this.keys.prefix, id])) === 1;
  }

  /**
   * Lists products using the indexes only (no keyspace scans):
   * - no filters: one ZRANGE on the sort index with offset/limit;
   * - with filters: SINTER of the category/brand/featured sets (or a price
   *   ZRANGE BYSCORE), then ZMSCORE for sorting and HMGET for stock.
   */
  async list(query: ProductQuery = {}): Promise<ProductPage> {
    const q = productQuerySchema.parse(query);
    const sortKey = this.sortKey(q.sort);
    const descending = q.sort !== 'price-asc';

    const filterSets: string[] = [];
    if (q.category) filterSets.push(this.keys.productsByCategory(q.category));
    if (q.brand) filterSets.push(this.keys.productsByBrand(slugify(q.brand)));
    if (q.featured) filterSets.push(this.keys.productsFeatured());
    const hasPriceFilter = q.minPriceCents !== undefined || q.maxPriceCents !== undefined;

    // Fast path: the sort index already holds every product in order.
    if (filterSets.length === 0 && !hasPriceFilter && q.inStock === undefined) {
      const [total, ids] = await Promise.all([
        this.client.zCard(sortKey),
        this.client.zRange(sortKey, q.offset, q.offset + q.limit - 1, { REV: descending }),
      ]);
      return { items: await this.findByIds(ids), total, offset: q.offset, limit: q.limit };
    }

    let ids: string[];
    if (filterSets.length > 0) {
      ids = await this.client.sInter(filterSets);
    } else {
      ids = await this.client.zRange(
        this.keys.productsByPrice(),
        q.minPriceCents ?? '-inf',
        q.maxPriceCents ?? '+inf',
        { BY: 'SCORE' },
      );
    }

    if (ids.length > 0 && hasPriceFilter && filterSets.length > 0) {
      const prices = await this.client.zmScore(this.keys.productsByPrice(), ids);
      const min = q.minPriceCents ?? 0;
      const max = q.maxPriceCents ?? Number.POSITIVE_INFINITY;
      ids = ids.filter((_, i) => {
        const price = prices[i];
        return price != null && price >= min && price <= max;
      });
    }

    if (ids.length > 0 && q.inStock !== undefined) {
      const stocks = await this.client.hmGet(this.keys.inventory(), ids);
      ids = ids.filter((_, i) => Number(stocks[i] ?? 0) > 0 === q.inStock);
    }

    if (ids.length > 0) {
      const scores = await this.client.zmScore(sortKey, ids);
      const scored = ids.map((id, i) => ({ id, score: scores[i] ?? 0 }));
      scored.sort((a, b) =>
        a.score === b.score
          ? a.id.localeCompare(b.id)
          : descending
            ? b.score - a.score
            : a.score - b.score,
      );
      ids = scored.map((entry) => entry.id);
    }

    const page = ids.slice(q.offset, q.offset + q.limit);
    return {
      items: await this.findByIds(page),
      total: ids.length,
      offset: q.offset,
      limit: q.limit,
    };
  }

  async count(): Promise<number> {
    return this.client.sCard(this.keys.products());
  }

  async countByCategory(): Promise<Record<Category, number>> {
    const counts = await Promise.all(
      CATEGORIES.map((c) => this.client.sCard(this.keys.productsByCategory(c))),
    );
    return Object.fromEntries(CATEGORIES.map((c, i) => [c, counts[i]!])) as Record<
      Category,
      number
    >;
  }

  async idsInCategory(category: Category): Promise<string[]> {
    return (await this.client.sMembers(this.keys.productsByCategory(category))).sort();
  }

  /** Best sellers from the products:by-sales ranking (incremented when orders are placed). */
  async topSelling(limit = 10): Promise<Array<{ product: Product; unitsSold: number }>> {
    const ranked = await this.client.zRangeWithScores(this.keys.productsBySales(), 0, limit - 1, {
      REV: true,
    });
    const products = await this.findByIds(ranked.map((r) => r.value));
    const sold = new Map(ranked.map((r) => [r.value, r.score]));
    return products.map((product) => ({ product, unitsSold: sold.get(product.id) ?? 0 }));
  }
}
