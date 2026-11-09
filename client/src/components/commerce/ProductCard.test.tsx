import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '@/api/types';
import { specHighlights, specValue } from '@/lib/specs';
import { formatPrice } from '@/lib/format';
import { isPlaceholderImage } from './ProductImage';
import { ProductCard } from './ProductCard';

const base: Product = {
  id: 'sony-wh-1000xm5',
  name: 'Sony WH-1000XM5',
  brand: 'Sony',
  brandSlug: 'sony',
  category: 'headphones',
  description: 'Noise-cancelling headphones.',
  priceCents: 39999,
  stock: 22,
  specs: { weightGrams: 250, noiseCancelling: true },
  imageUrl: 'https://placehold.co/800x600/png',
  featured: true,
  createdAt: '2026-10-16T09:00:00.000Z',
  updatedAt: '2026-10-16T09:00:00.000Z',
};

const renderCard = (product: Product, onAddToCart = vi.fn()) => {
  render(
    <MemoryRouter>
      <ProductCard product={product} onAddToCart={onAddToCart} />
    </MemoryRouter>,
  );
  return onAddToCart;
};

describe('<ProductCard>', () => {
  it('links the name to the product page and shows price, brand and specs', () => {
    renderCard(base);
    const article = screen.getByRole('article', { name: 'Sony WH-1000XM5' });
    expect(article).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sony WH-1000XM5' })).toHaveAttribute(
      'href',
      '/products/sony-wh-1000xm5',
    );
    expect(screen.getByText('$399.99')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Key specifications' })).toHaveTextContent('250 gANC');
  });

  it('adds to cart with a descriptive button label', () => {
    const onAdd = renderCard(base);
    fireEvent.click(screen.getByRole('button', { name: 'Add Sony WH-1000XM5 to cart' }));
    expect(onAdd).toHaveBeenCalledWith(base);
  });

  it('shows "Only N left" for low stock', () => {
    renderCard({ ...base, stock: 2 });
    expect(screen.getByText('Only 2 left')).toBeInTheDocument();
  });

  it('disables adding when out of stock and says so in text', () => {
    const onAdd = renderCard({ ...base, stock: 0 });
    const button = screen.getByRole('button', { name: 'Sony WH-1000XM5 is out of stock' });
    expect(button).toBeDisabled();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe('formatting helpers', () => {
  it('formats integer cents as USD', () => {
    expect(formatPrice(189900)).toBe('$1,899.00');
    expect(formatPrice(999)).toBe('$9.99');
  });

  it('labels and shortens specifications', () => {
    expect(specValue('refreshHz', 240)).toBe('240 Hz');
    expect(specValue('sizeInches', 27)).toBe('27″');
    expect(specValue('ports', ['HDMI', 'USB-C'])).toBe('HDMI, USB-C');
    expect(specHighlights({ gpu: 'NVIDIA GeForce RTX 4060 8GB', ramGb: 16 })).toEqual([
      'RTX 4060 8GB',
      '16 GB',
    ]);
  });

  it('detects placeholder images', () => {
    expect(isPlaceholderImage('https://placehold.co/800x600/png')).toBe(true);
    expect(isPlaceholderImage('https://cdn.example.com/a.jpg')).toBe(false);
    expect(isPlaceholderImage('not a url')).toBe(true);
  });
});
