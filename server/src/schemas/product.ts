import { z } from 'zod';
import { idSchema } from './common.js';

export const CATEGORIES = [
  'gaming-laptops',
  'laptops',
  'pcs',
  'mice',
  'monitors',
  'headphones',
  'microphones',
] as const;

export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;

/** Flexible, per-category specifications (stored as JSON in the product hash). */
export const specsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
);
export type ProductSpecs = z.infer<typeof specsSchema>;

export const productInputSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().min(1).max(80),
  category: categorySchema,
  description: z.string().trim().min(1).max(5000),
  priceCents: z.number().int().min(0),
  stock: z.number().int().min(0),
  specs: specsSchema.default({}),
  imageUrl: z.string().url(),
  featured: z.boolean().default(false),
  /** ISO timestamp; defaults to now. Seed data passes fixed dates. */
  createdAt: z.string().datetime().optional(),
});
export type ProductInput = z.input<typeof productInputSchema>;

/** Fields that may be changed after creation. Stock is changed through the inventory repository. */
export const productUpdateSchema = productInputSchema
  .omit({ id: true, stock: true, createdAt: true })
  .partial();
export type ProductUpdate = z.input<typeof productUpdateSchema>;

export interface Product {
  id: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: Category;
  description: string;
  priceCents: number;
  stock: number;
  specs: ProductSpecs;
  imageUrl: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PRODUCT_SORTS = ['newest', 'price-asc', 'price-desc', 'best-selling'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const productQuerySchema = z.object({
  category: categorySchema.optional(),
  brand: z.string().trim().min(1).optional(),
  featured: z.boolean().optional(),
  inStock: z.boolean().optional(),
  minPriceCents: z.number().int().min(0).optional(),
  maxPriceCents: z.number().int().min(0).optional(),
  sort: z.enum(PRODUCT_SORTS).default('newest'),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
});
export type ProductQuery = z.input<typeof productQuerySchema>;
