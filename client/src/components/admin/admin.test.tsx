import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { OrderProgress, OrderStatusBadge } from '@/components/commerce/OrderStatus';
import { BarList } from './BarList';
import { StatCard } from './StatCard';

describe('<BarList>', () => {
  it('lists each category with its value and share as text, scaled to the largest bar', () => {
    render(
      <MemoryRouter>
        <BarList
          label="Orders by status"
          unit="orders"
          items={[
            { key: 'pending', label: 'Pending', value: 1, href: '/admin/orders?status=pending' },
            { key: 'paid', label: 'Paid', value: 3 },
          ]}
        />
      </MemoryRouter>,
    );
    const list = screen.getByRole('list', { name: 'Orders by status' });
    const [pending, paid] = within(list).getAllByRole('listitem');
    expect(pending).toHaveTextContent('Pending1 orders, 25%');
    expect(paid).toHaveTextContent('Paid3 orders, 75%');
    expect(within(pending!).getByRole('link')).toHaveAttribute(
      'href',
      '/admin/orders?status=pending',
    );
    // Bars are relative to the max value: 1/3 and 3/3.
    const widths = [pending, paid].map(
      (li) => (li!.querySelector('[aria-hidden] > span') as HTMLElement).style.width,
    );
    expect(parseFloat(widths[0]!)).toBeCloseTo(33.33, 1);
    expect(widths[1]).toBe('100%');
  });

  it('shows the empty message when every value is zero', () => {
    render(
      <BarList
        label="Top sellers"
        unit="units"
        items={[{ key: 'a', label: 'A', value: 0 }]}
        empty="No sales yet."
      />,
    );
    expect(screen.getByText('No sales yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('order status', () => {
  it('marks completed and current steps for screen readers', () => {
    render(<OrderProgress status="paid" />);
    const steps = within(screen.getByRole('list', { name: 'Order progress' })).getAllByRole(
      'listitem',
    );
    expect(steps.map((s) => s.textContent)).toEqual([
      'Pending (completed)',
      'Paid (current)',
      'Shipped',
      'Delivered',
    ]);
    expect(steps[1]).toHaveAttribute('aria-current', 'step');
  });

  it('shows a cancelled state instead of the tracker', () => {
    render(<OrderProgress status="cancelled" />);
    expect(screen.getByText('Order cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('labels statuses in text, not colour only', () => {
    render(<OrderStatusBadge status="shipped" />);
    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });
});

describe('<StatCard>', () => {
  it('renders label, value and detail', () => {
    render(<StatCard label="Revenue" value="$1,234.00" detail="All orders except cancelled" />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$1,234.00')).toHaveClass('eh-numeric');
    expect(screen.getByText('All orders except cancelled')).toBeInTheDocument();
  });
});
