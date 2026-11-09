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

export const CATEGORY_INFO: Record<Category, { name: string; description: string }> = {
  'gaming-laptops': {
    name: 'Gaming Laptops',
    description: 'High-refresh displays and dedicated GPUs for gaming on the go.',
  },
  laptops: {
    name: 'Laptops',
    description: 'Ultrabooks and everyday notebooks for work and study.',
  },
  pcs: { name: 'Desktop PCs', description: 'Gaming towers, workstations and compact desktops.' },
  mice: { name: 'Mice', description: 'Wired and wireless mice for gaming and productivity.' },
  monitors: { name: 'Monitors', description: 'OLED, IPS and ultrawide displays.' },
  headphones: {
    name: 'Headphones',
    description: 'Noise-cancelling, gaming and audiophile headphones.',
  },
  microphones: {
    name: 'Microphones',
    description: 'USB and XLR microphones for streaming and podcasts.',
  },
};

/** Flexible, per-category specifications (stored as JSON in the product hash). */
export const specsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
);
export type ProductSpecs = z.infer<typeof specsSchema>;

/** Editable product fields, without defaults. */
const productFields = {
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().min(1).max(80),
  category: categorySchema,
  description: z.string().trim().min(1).max(5000),
  priceCents: z.number().int().min(0),
  specs: specsSchema,
  imageUrl: z.string().url(),
  featured: z.boolean(),
};

export const productInputSchema = z.object({
  ...productFields,
  id: idSchema,
  stock: z.number().int().min(0),
  specs: specsSchema.default({}),
  featured: z.boolean().default(false),
  /** ISO timestamp; defaults to now. Seed data passes fixed dates. */
  createdAt: z.string().datetime().optional(),
});
export type ProductInput = z.input<typeof productInputSchema>;

/**
 * Fields that may be changed after creation. Stock is changed through the
 * inventory repository. Built from the default-free field list on purpose:
 * in Zod 4, `.partial()` still applies `.default()` values, so deriving it
 * from the input schema would reset `featured`/`specs` on every partial update.
 */
export const productUpdateSchema = z.object(productFields).partial();
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
  /** Free-text search: every word must appear in the name, brand or category. */
  q: z.string().trim().min(1).max(100).optional(),
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
