import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  title: string;
  description?: ReactNode;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. Errors default to longer. `Infinity` keeps it open. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'variant' | 'duration'>> {
  id: number;
  description?: ReactNode;
  action?: ToastOptions['action'];
}

interface ToastApi {
  toast: (options: ToastOptions) => number;
  success: (title: string, description?: ReactNode) => number;
  error: (title: string, description?: ReactNode) => number;
  info: (title: string, description?: ReactNode) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const icons: Record<ToastVariant, ReactNode> = {
  info: <Info aria-hidden />,
  success: <CircleCheck aria-hidden />,
  warning: <TriangleAlert aria-hidden />,
  error: <CircleAlert aria-hidden />,
};

const accents: Record<ToastVariant, string> = {
  info: 'text-accent-text',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
};

const MAX_VISIBLE = 4;

/**
 * Renders notifications in a live region (bottom-right on desktop, bottom on
 * phones). Errors use role="alert" (announced immediately), everything else
 * role="status" (announced politely). Timers pause on hover and focus.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    const variant = options.variant ?? 'info';
    const item: ToastItem = {
      id,
      title: options.title,
      description: options.description,
      variant,
      duration: options.duration ?? (variant === 'error' ? 7000 : 4500),
      action: options.action,
    };
    setToasts((list) => [...list, item].slice(-MAX_VISIBLE));
    return id;
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ title, description, variant: 'success' }),
      error: (title, description) => toast({ title, description, variant: 'error' }),
      info: (title, description) => toast({ title, description, variant: 'info' }),
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext value={api}>
      {children}
      <section
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6"
        style={{ zIndex: 'var(--eh-z-toast)' }}
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </section>
    </ToastContext>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || !Number.isFinite(toast.duration)) return;
    const timer = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [paused, toast.duration, onDismiss]);

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-elevated p-4 text-fg shadow-lg motion-safe:animate-[eh-toast-in_var(--eh-duration-slow)_var(--eh-ease-emphasized)]"
    >
      <span className={cn('mt-0.5 shrink-0 [&>svg]:size-5', accents[toast.variant])}>
        {icons[toast.variant]}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description && <div className="text-sm text-fg-secondary">{toast.description}</div>}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action!.onClick();
              onDismiss();
            }}
            className="mt-1 self-start rounded-xs text-sm font-medium text-accent-text hover:underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-m-1 rounded-sm p-1 text-fg-muted transition-colors duration-fast hover:bg-accent-soft hover:text-fg"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** `const toast = useToast(); toast.success('Added to cart')` */
export function useToast(): ToastApi {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
