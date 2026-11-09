import type { Address } from '../../src/schemas/customer.js';
import type { ProductInput } from '../../src/schemas/product.js';

let counter = 0;

export function productInput(overrides: Partial<ProductInput> = {}): ProductInput {
  counter += 1;
  return {
    id: `test-product-${counter}`,
    name: `Test Product ${counter}`,
    brand: 'Acme',
    category: 'mice',
    description: 'A product used by the test suite.',
    priceCents: 1000 * counter,
    stock: 10,
    specs: { dpi: 16000, colors: ['black', 'white'], wireless: true },
    imageUrl: 'https://placehold.co/800x600/png?text=Test',
    featured: false,
    ...overrides,
  };
}

export const address: Address = {
  line1: '1 Test Street',
  city: 'Testville',
  postalCode: '12345',
  country: 'US',
};
