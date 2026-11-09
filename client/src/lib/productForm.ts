import type { CategorySlug, Product, ProductInput, SpecValue } from '@/api/types';
import { CATEGORY_SLUGS } from '@/api/types';
import type { FieldErrors } from './validation';

export type SpecType = 'text' | 'number' | 'boolean' | 'list';

export interface SpecRow {
  uid: string;
  key: string;
  type: SpecType;
  value: string;
}

/** Editable form state: everything is a string until it is validated. */
export interface ProductFormState {
  id: string;
  name: string;
  brand: string;
  category: CategorySlug | '';
  description: string;
  /** Dollars, e.g. "1899.00". */
  price: string;
  stock: string;
  imageUrl: string;
  featured: boolean;
  specs: SpecRow[];
}

let uidCounter = 0;
export const newSpecRow = (partial: Partial<SpecRow> = {}): SpecRow => ({
  uid: `spec-${++uidCounter}`,
  key: '',
  type: 'text',
  value: '',
  ...partial,
});

function toRow(key: string, value: SpecValue): SpecRow {
  if (typeof value === 'number') return newSpecRow({ key, type: 'number', value: String(value) });
  if (typeof value === 'boolean') return newSpecRow({ key, type: 'boolean', value: String(value) });
  if (Array.isArray(value)) return newSpecRow({ key, type: 'list', value: value.join(', ') });
  return newSpecRow({ key, type: 'text', value: value ?? '' });
}

export function formFromProduct(p?: Product): ProductFormState {
  return {
    id: p?.id ?? '',
    name: p?.name ?? '',
    brand: p?.brand ?? '',
    category: p?.category ?? '',
    description: p?.description ?? '',
    price: p ? (p.priceCents / 100).toFixed(2) : '',
    stock: p ? String(p.stock) : '0',
    imageUrl: p?.imageUrl ?? '',
    featured: p?.featured ?? false,
    specs: p ? Object.entries(p.specs).map(([k, v]) => toRow(k, v)) : [],
  };
}

const PRICE = /^\d{1,7}(\.\d{1,2})?$/;
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const SPEC_KEY = /^[A-Za-z][A-Za-z0-9]{0,39}$/;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates the form (same limits as the server's Zod schema) and converts it
 * into the API payload. Spec errors are keyed `spec.<uid>.key` / `spec.<uid>.value`.
 */
export function parseProductForm(
  s: ProductFormState,
  mode: 'create' | 'edit',
): { errors: FieldErrors; input?: ProductInput } {
  const errors: FieldErrors = {};
  if (mode === 'create' && s.id.trim() && !ID.test(s.id.trim())) {
    errors.id = 'Use letters, digits, "-" or "_" (max 64).';
  }
  if (!s.name.trim()) errors.name = 'Enter a product name.';
  else if (s.name.trim().length > 200) errors.name = 'Keep the name under 200 characters.';
  if (!s.brand.trim()) errors.brand = 'Enter a brand.';
  if (!CATEGORY_SLUGS.includes(s.category as CategorySlug)) errors.category = 'Choose a category.';
  if (!s.description.trim()) errors.description = 'Write a short description.';
  if (!PRICE.test(s.price.trim())) errors.price = 'Enter a price like 199 or 199.99.';
  if (!/^\d{1,6}$/.test(s.stock.trim()))
    errors.stock = 'Enter a whole number of units (0 or more).';
  if (!isHttpUrl(s.imageUrl.trim()))
    errors.imageUrl = 'Enter a full image URL starting with https://';

  const specs: Record<string, SpecValue> = {};
  const seen = new Set<string>();
  for (const row of s.specs) {
    const key = row.key.trim();
    const value = row.value.trim();
    if (!key && !value) continue; // ignore blank rows
    if (!SPEC_KEY.test(key))
      errors[`spec.${row.uid}.key`] = 'Use a name like refreshHz (letters and digits).';
    else if (seen.has(key)) errors[`spec.${row.uid}.key`] = 'This name is used twice.';
    seen.add(key);

    if (row.type === 'number') {
      const n = Number(value);
      if (!value || !Number.isFinite(n)) errors[`spec.${row.uid}.value`] = 'Enter a number.';
      else specs[key] = n;
    } else if (row.type === 'boolean') {
      specs[key] = value === 'true';
    } else if (row.type === 'list') {
      const items = value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (items.length === 0) errors[`spec.${row.uid}.value`] = 'Enter items separated by commas.';
      else specs[key] = items;
    } else {
      if (!value) errors[`spec.${row.uid}.value`] = 'Enter a value.';
      else specs[key] = value;
    }
  }

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    input: {
      ...(mode === 'create' && s.id.trim() ? { id: s.id.trim() } : {}),
      name: s.name.trim(),
      brand: s.brand.trim(),
      category: s.category as CategorySlug,
      description: s.description.trim(),
      priceCents: Math.round(Number(s.price.trim()) * 100),
      stock: Number(s.stock.trim()),
      specs,
      imageUrl: s.imageUrl.trim(),
      featured: s.featured,
    },
  };
}

/** Maps API field paths (priceCents, specs.x) onto the form's field names. */
export function mapServerFieldErrors(server: FieldErrors): FieldErrors {
  const out: FieldErrors = {};
  for (const [path, message] of Object.entries(server)) {
    if (path === 'priceCents') out.price = message;
    else if (path.startsWith('specs')) out.specs = message;
    else out[path] = message;
  }
  return out;
}
