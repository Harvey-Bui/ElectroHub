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

// ── Orders ──────────────────────────────────────────────────────────────────
export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2, e.g. "VN". */
  country: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  itemCount: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shippingAddress: Address;
  contact: { email: string; name: string; phone?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutInput {
  email: string;
  name: string;
  phone?: string;
  shippingAddress: Address;
}

// ── Admin ───────────────────────────────────────────────────────────────────
export interface AdminSession {
  username: string;
  expiresAt: string;
}

export interface LowStockEntry {
  productId: string;
  name: string;
  brand: string;
  category: CategorySlug;
  stock: number;
  priceCents: number;
}

export interface Dashboard {
  generatedAt: string;
  catalog: { products: number; byCategory: Record<CategorySlug, number> };
  customers: number;
  orders: {
    total: number;
    byStatus: Record<OrderStatus, number>;
    revenueCents: number;
    averageOrderCents: number;
  };
  inventory: {
    trackedProducts: number;
    totalUnits: number;
    lowStock: number;
    outOfStock: number;
    lowStockThreshold: number;
  };
  lowStock: LowStockEntry[];
  topSellers: Array<{ productId: string; name: string; unitsSold: number }>;
  recentOrders: Array<
    Pick<Order, 'id' | 'customerId' | 'status' | 'totalCents' | 'itemCount' | 'createdAt'>
  >;
}

/** Body for POST /api/admin/products (`id` optional: derived from the name). */
export interface ProductInput {
  id?: string;
  name: string;
  brand: string;
  category: CategorySlug;
  description: string;
  priceCents: number;
  stock: number;
  specs: Record<string, SpecValue>;
  imageUrl: string;
  featured: boolean;
}

/** Body for PUT /api/admin/products/:id. Every field optional. */
export type ProductUpdate = Partial<Omit<ProductInput, 'id'>>;

export interface Cart {
  items: CartLine[];
  itemCount: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  hasStockIssues: boolean;
  removedProductIds: string[];
}
