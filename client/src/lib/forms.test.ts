import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/http';
import type { CheckoutInput, Product } from '@/api/types';
import { formFromProduct, mapServerFieldErrors, newSpecRow, parseProductForm } from './productForm';
import { cleanCheckout, validateCheckout } from './validation';

const validCheckout: CheckoutInput = {
  email: ' shopper@example.com ',
  name: 'Sam Shopper',
  phone: '',
  shippingAddress: {
    line1: '1 Main St',
    line2: '  ',
    city: 'Hanoi',
    region: '',
    postalCode: '100000',
    country: 'VN',
  },
};

describe('checkout validation', () => {
  it('accepts a complete form and trims / drops empty optionals', () => {
    expect(validateCheckout(validCheckout)).toEqual({});
    expect(cleanCheckout(validCheckout)).toEqual({
      email: 'shopper@example.com',
      name: 'Sam Shopper',
      phone: undefined,
      shippingAddress: {
        line1: '1 Main St',
        line2: undefined,
        city: 'Hanoi',
        region: undefined,
        postalCode: '100000',
        country: 'VN',
      },
    });
  });

  it('reports every missing or invalid field under the API path', () => {
    const errors = validateCheckout({
      email: 'nope',
      name: ' ',
      shippingAddress: { line1: '', city: '', postalCode: '', country: '' },
    });
    expect(Object.keys(errors).sort()).toEqual([
      'email',
      'name',
      'shippingAddress.city',
      'shippingAddress.country',
      'shippingAddress.line1',
      'shippingAddress.postalCode',
    ]);
    expect(errors.email).toMatch(/valid email/);
  });
});

describe('ApiError.fieldErrors', () => {
  it('maps VALIDATION_ERROR details to a path → message record', () => {
    const error = new ApiError(400, 'Request validation failed', 'VALIDATION_ERROR', {
      error: {
        code: 'VALIDATION_ERROR',
        details: [
          { path: 'shippingAddress.country', message: 'Use an ISO 3166-1 alpha-2 country code' },
          { path: 'email', message: 'Invalid email' },
        ],
      },
    });
    expect(error.fieldErrors).toEqual({
      'shippingAddress.country': 'Use an ISO 3166-1 alpha-2 country code',
      email: 'Invalid email',
    });
    expect(new ApiError(409, 'x', 'INSUFFICIENT_STOCK').fieldErrors).toEqual({});
  });
});

describe('product form', () => {
  const product: Product = {
    id: 'lg-27',
    name: 'LG 27',
    brand: 'LG',
    brandSlug: 'lg',
    category: 'monitors',
    description: 'OLED',
    priceCents: 79999,
    stock: 7,
    specs: { refreshHz: 240, hdr: 'HDR10', ports: ['HDMI', 'DP'], curved: false },
    imageUrl: 'https://cdn.example.com/lg.png',
    featured: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('round-trips a product through the form without changing it', () => {
    const { errors, input } = parseProductForm(formFromProduct(product), 'edit');
    expect(errors).toEqual({});
    expect(input).toEqual({
      name: 'LG 27',
      brand: 'LG',
      category: 'monitors',
      description: 'OLED',
      priceCents: 79999,
      stock: 7,
      specs: { refreshHz: 240, hdr: 'HDR10', ports: ['HDMI', 'DP'], curved: false },
      imageUrl: 'https://cdn.example.com/lg.png',
      featured: true,
    });
  });

  it('converts dollars to integer cents without float drift', () => {
    const form = { ...formFromProduct(product), price: '19.99' };
    expect(parseProductForm(form, 'edit').input?.priceCents).toBe(1999);
    expect(parseProductForm({ ...form, price: '0.1' }, 'edit').input?.priceCents).toBe(10);
  });

  it('rejects bad values and duplicate or invalid spec names', () => {
    const bad = newSpecRow({ key: 'refreshHz', type: 'number', value: 'fast' });
    const dup = newSpecRow({ key: 'refreshHz', type: 'text', value: 'x' });
    const { errors, input } = parseProductForm(
      {
        ...formFromProduct(),
        id: 'has space',
        name: 'X',
        brand: 'Y',
        category: 'mice',
        description: 'Z',
        price: '12.345',
        stock: '-1',
        imageUrl: 'ftp://nope',
        specs: [bad, dup, newSpecRow()], // the blank row is ignored
      },
      'create',
    );
    expect(input).toBeUndefined();
    expect(errors).toMatchObject({
      id: expect.any(String),
      price: expect.any(String),
      stock: expect.any(String),
      imageUrl: expect.any(String),
      [`spec.${bad.uid}.value`]: 'Enter a number.',
      [`spec.${dup.uid}.key`]: 'This name is used twice.',
    });
  });

  it('maps server field paths onto form fields', () => {
    expect(
      mapServerFieldErrors({ priceCents: 'Too small', 'specs.x': 'Bad', name: 'Required' }),
    ).toEqual({
      price: 'Too small',
      specs: 'Bad',
      name: 'Required',
    });
  });
});
