import { useId, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { useDialog } from './useDialog';

const widths = { sm: '24rem', md: '32rem', lg: '44rem' } as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Action buttons, right-aligned on desktop and stacked full width on phones. */
  footer?: ReactNode;
  size?: keyof typeof widths;
  /** Close when the backdrop is clicked. Default true; turn off for forms with unsaved input. */
  closeOnBackdrop?: boolean;
  /** Use "alertdialog" for confirmations that need an explicit answer. */
  role?: 'dialog' | 'alertdialog';
  className?: string;
}

/**
 * Centred dialog on the native <dialog> element: focus trap, Esc to close,
 * page inert behind it, focus restored on close. Put `data-autofocus` on the
 * element that should receive focus first (defaults to the first focusable).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  role = 'dialog',
  className,
}: ModalProps) {
  const { ref, dialogProps } = useDialog(open, onClose, closeOnBackdrop);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      ref={ref}
      role={role === 'alertdialog' ? 'alertdialog' : undefined}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="eh-dialog eh-modal"
      style={{ '--eh-modal-width': widths[size] } as CSSProperties}
      {...dialogProps}
    >
      <div
        className={cn(
          'flex max-h-[min(85dvh,48rem)] flex-col overflow-hidden rounded-xl border border-border bg-elevated text-fg shadow-xl',
          className,
        )}
      >
        <header className="flex items-start gap-4 px-6 pt-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-sm text-fg-secondary">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Close dialog"
            onClick={onClose}
            className="-mr-2 -mt-1"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </header>
        {children && (
          <div className="overflow-y-auto px-6 py-5 text-sm text-fg-secondary">{children}</div>
        )}
        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-border bg-surface px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}
