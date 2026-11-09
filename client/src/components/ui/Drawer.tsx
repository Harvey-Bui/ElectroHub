import { useId, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { useDialog } from './useDialog';

const widths = { sm: '20rem', md: '26rem', lg: '34rem' } as const;

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Sticky area at the bottom (totals, primary action). */
  footer?: ReactNode;
  side?: 'right' | 'left';
  size?: keyof typeof widths;
  className?: string;
}

/**
 * Side panel (cart, mobile navigation, filters) built on the native <dialog>,
 * so it gets the same focus trap, Esc handling and focus restoration as Modal.
 * Full width on small phones.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  size = 'md',
  className,
}: DrawerProps) {
  const { ref, dialogProps } = useDialog(open, onClose);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      ref={ref}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      data-side={side}
      className="eh-dialog eh-drawer"
      style={{ '--eh-drawer-width': widths[size] } as CSSProperties}
      {...dialogProps}
    >
      <div
        className={cn(
          'flex h-full flex-col bg-elevated text-fg shadow-xl',
          side === 'right' ? 'border-l border-border' : 'border-r border-border',
          className,
        )}
      >
        <header className="flex items-center gap-4 border-b border-border px-5 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-sm text-fg-muted">
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" iconOnly aria-label="Close panel" onClick={onClose}>
            <X className="size-4" aria-hidden />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && (
          <footer className="border-t border-border bg-surface px-5 py-4">{footer}</footer>
        )}
      </div>
    </dialog>
  );
}
