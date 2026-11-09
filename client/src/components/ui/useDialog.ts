import { useEffect, useRef, type MouseEvent, type SyntheticEvent } from 'react';

/**
 * Drives a native <dialog> from React state.
 *
 * Native showModal() gives us, for free: a focus trap, Esc to close, an inert
 * page behind the dialog, the top layer (no z-index fights) and focus
 * returning to the opener on close. This hook adds scroll locking and routes
 * Esc / backdrop clicks through `onClose` so React state stays the source of truth.
 */
export function useDialog(open: boolean, onClose: () => void, closeOnBackdrop = true) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const previous = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.documentElement.style.overflow = previous;
      };
    }
    if (!open && dialog.open) dialog.close();
    return undefined;
  }, [open]);

  // Close the native dialog if the component unmounts while open.
  useEffect(() => () => ref.current?.close(), []);

  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault(); // let React decide
    onClose();
  };

  // A click whose target is the <dialog> itself landed on the backdrop.
  const onMouseDown = (event: MouseEvent<HTMLDialogElement>) => {
    if (closeOnBackdrop && event.target === event.currentTarget) onClose();
  };

  return { ref, dialogProps: { onCancel, onMouseDown } };
}
