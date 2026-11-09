import { slugify } from '../db/keys.js';
import { HttpError } from '../lib/httpError.js';
import type { Repositories } from '../repositories/index.js';
import type {
  AdminCreateProductBody,
  AdminUpdateProductBody,
  ProductListQuery,
} from '../schemas/api.js';
import {
  CATEGORIES,
  CATEGORY_INFO,
  categorySchema,
  type Category,
  type Product,
} from '../schemas/product.js';

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CategorySummary {
  slug: Category;
  name: string;
  description: string;
  productCount: number;
}

export interface LowStockEntry {
  productId: string;
  name: string;
  brand: string;
  category: Category;
  stock: number;
  priceCents: number;
}

/** Catalogue browsing (public) and product management (admin). */
export class CatalogService {
  constructor(private readonly repos: Repositories) {}

  async listProducts(query: ProductListQuery): Promise<Paginated<Product>> {
    const { page, limit, ...filters } = query;
    const result = await this.repos.products.list({
      ...filters,
      offset: (page - 1) * limit,
      limit,
    });
    return {
      items: result.items,
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  /** Validates a category slug from the URL; unknown categories are a 404, not a 400. */
  parseCategory(slug: string): Category {
    const parsed = categorySchema.safeParse(slug);
    if (!parsed.success)
      throw HttpError.notFound(`Category "${slug}" not found`, 'CATEGORY_NOT_FOUND');
    return parsed.data;
  }

  async getProduct(id: string): Promise<Product> {
    const product = await this.repos.products.findById(id);
    if (!product) throw HttpError.notFound(`Product "${id}" not found`, 'PRODUCT_NOT_FOUND');
    return product;
  }

  async featured(limit: number): Promise<Product[]> {
    return (await this.repos.products.list({ featured: true, sort: 'newest', limit })).items;
  }

  async categories(): Promise<CategorySummary[]> {
    const counts = await this.repos.products.countByCategory();
    return CATEGORIES.map((slug) => ({ slug, ...CATEGORY_INFO[slug], productCount: counts[slug] }));
  }

  async createProduct(input: AdminCreateProductBody): Promise<Product> {
    const id = input.id ?? slugify(input.name);
    if (!id) throw HttpError.badRequest('Cannot derive a product id from this name; provide "id"');
    return this.repos.products.create({ ...input, id });
  }

  async updateProduct(id: string, input: AdminUpdateProductBody): Promise<Product> {
    const { stock, ...fields } = input;
    let product: Product | null;
    if (Object.keys(fields).length > 0) {
      product = await this.repos.products.update(id, fields);
    } else {
      product = await this.repos.products.findById(id);
    }
    if (!product) throw HttpError.notFound(`Product "${id}" not found`, 'PRODUCT_NOT_FOUND');

    if (stock !== undefined) {
      product = { ...product, stock: await this.repos.inventory.setStock(id, stock) };
    }
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    if (!(await this.repos.products.delete(id))) {
      throw HttpError.notFound(`Product "${id}" not found`, 'PRODUCT_NOT_FOUND');
    }
  }

  /** Products at or below the low-stock threshold, lowest stock first. */
  async lowStock(limit: number): Promise<LowStockEntry[]> {
    const lines = await this.repos.inventory.lowStock(limit);
    const products = await this.repos.products.findByIds(lines.map((l) => l.productId));
    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      stock: p.stock,
      priceCents: p.priceCents,
    }));
  }
}
