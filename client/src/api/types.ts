/** Response shapes of the ElectroHub API (see docs/API.md). Money is integer cents. */

export const CATEGORY_SLUGS = [
  'gaming-laptops',
  'laptops',
  'pcs',
  'mice',
  'monitors',
  'headphones',
  'microphones',
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export type SpecValue = string | number | boolean | string[] | null;

export interface Product {
  id: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: CategorySlug;
  description: string;
  priceCents: number;
  stock: number;
  specs: Record<string, SpecValue>;
  imageUrl: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  slug: CategorySlug;
  name: string;
  description: string;
  productCount: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  pagination: Pagination;
}

export type ProductSort = 'newest' | 'price-asc' | 'price-desc' | 'best-selling';

export interface ProductQuery {
  q?: string;
  category?: CategorySlug;
  brand?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  featured?: boolean;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

export interface CartLine {
  productId: string;
  name: string;
  brand: string;
  category: CategorySlug;
  imageUrl: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  stock: number;
  exceedsStock: boolean;
}

export interface Cart {
  items: CartLine[];
  itemCount: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  hasStockIssues: boolean;
  removedProductIds: string[];
}
