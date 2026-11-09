const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** 189900 → "$1,899.00". The API always sends integer cents. */
export function formatPrice(cents: number): string {
  return currency.format(cents / 100);
}

/** "gaming-laptops" → "Gaming Laptops" (fallback when the API label is not at hand). */
export function titleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** 1 → "1 item", 3 → "3 items". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
