import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { QuantityStepper } from './QuantityStepper';
import { Select } from './Select';
import { Textarea } from './Textarea';
import { ToastProvider, useToast } from './Toast';

describe('<Button>', () => {
  it('defaults to type="button" and fires clicks', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is busy and disabled while loading, and announces the loading text', () => {
    const onClick = vi.fn();
    render(
      <Button loading loadingText="Saving order" onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status', { name: 'Saving order' })).toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('form controls', () => {
  it('<Input> links its label, hint and error', () => {
    const { rerender } = render(<Input label="Email" hint="We never share it." />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('We never share it.');
    expect(input).not.toHaveAttribute('aria-invalid');

    rerender(<Input label="Email" hint="We never share it." error="Enter a valid email." />);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email.');
  });

  it('<Select> renders a labelled native select with a placeholder', () => {
    render(
      <Select
        label="Category"
        placeholder="Choose…"
        defaultValue=""
        options={[{ value: 'mice', label: 'Mice' }]}
      />,
    );
    const select = screen.getByLabelText('Category');
    expect(select.tagName).toBe('SELECT');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Choose…', 'Mice']);
  });

  it('<Textarea> counts characters against maxLength', () => {
    render(<Textarea label="Note" maxLength={10} />);
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'hello' } });
    expect(screen.getByText('5 / 10')).toBeInTheDocument();
  });
});

describe('<QuantityStepper>', () => {
  function Harness({ max = 3 }: { max?: number }) {
    const [value, setValue] = useState(1);
    return <QuantityStepper value={value} onChange={setValue} min={1} max={max} label="Qty" />;
  }

  it('steps within bounds and disables the buttons at the limits', () => {
    render(<Harness />);
    const input = screen.getByRole('spinbutton', { name: 'Qty' });
    const dec = screen.getByRole('button', { name: 'Decrease quantity' });
    const inc = screen.getByRole('button', { name: 'Increase quantity' });

    expect(dec).toBeDisabled();
    fireEvent.click(inc);
    fireEvent.click(inc);
    expect(input).toHaveValue('3');
    expect(input).toHaveAttribute('aria-valuenow', '3');
    expect(inc).toBeDisabled();
  });

  it('supports the keyboard and clamps typed values', () => {
    render(<Harness max={5} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveValue('2');
    fireEvent.keyDown(input, { key: 'End' });
    expect(input).toHaveValue('5');
    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('5');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('5'); // invalid input reverts to the current value
  });
});

describe('<Modal>', () => {
  it('opens as a labelled dialog and closes on Esc and the close button', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open={false} onClose={onClose} title="Cancel order?" description="Stock returns." />,
    );
    const dialog = document.querySelector('dialog')!;
    expect(dialog.open).toBe(false);

    rerender(<Modal open onClose={onClose} title="Cancel order?" description="Stock returns." />);
    expect(dialog.open).toBe(true);
    expect(dialog).toHaveAccessibleName('Cancel order?');
    expect(dialog).toHaveAccessibleDescription('Stock returns.');

    fireEvent(dialog, new Event('cancel', { cancelable: true })); // what Esc dispatches
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog', hidden: true }));
    expect(onClose).toHaveBeenCalledTimes(2);

    rerender(<Modal open={false} onClose={onClose} title="Cancel order?" />);
    expect(dialog.open).toBe(false);
  });
});

describe('Toast', () => {
  function Trigger() {
    const toast = useToast();
    return (
      <>
        <button onClick={() => toast.success('Added to cart', 'Sony WH-1000XM5')}>ok</button>
        <button onClick={() => toast.error('Payment failed')}>fail</button>
      </>
    );
  }

  it('announces success politely and errors assertively, and auto-dismisses', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('ok'));
    fireEvent.click(screen.getByText('fail'));

    expect(screen.getByRole('status')).toHaveTextContent('Added to cartSony WH-1000XM5');
    expect(screen.getByRole('alert')).toHaveTextContent('Payment failed');

    act(() => vi.advanceTimersByTime(5000)); // success: 4.5 s
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument(); // errors stay longer (7 s)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
