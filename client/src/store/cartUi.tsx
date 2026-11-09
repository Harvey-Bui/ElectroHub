import { createContext, use, useMemo, useState, type ReactNode } from 'react';

interface CartUiValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CartUiContext = createContext<CartUiValue | null>(null);

/** Open/closed state of the cart drawer, shared by the navbar and "Add to cart" buttons. */
export function CartUiProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const value = useMemo(
    () => ({ isOpen, open: () => setOpen(true), close: () => setOpen(false) }),
    [isOpen],
  );
  return <CartUiContext value={value}>{children}</CartUiContext>;
}

export function useCartUi(): CartUiValue {
  const ctx = use(CartUiContext);
  if (!ctx) throw new Error('useCartUi must be used inside <CartUiProvider>');
  return ctx;
}
