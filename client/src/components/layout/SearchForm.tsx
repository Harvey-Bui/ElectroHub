import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SearchFormProps {
  className?: string;
  /** Focus the field on mount (mobile menu). */
  autoFocus?: boolean;
  /** Called after navigating to the results (e.g. to close a menu). */
  onSubmitted?: () => void;
  /** Register the global "/" shortcut that focuses this field. */
  shortcut?: boolean;
}

/**
 * Product search (role="search"). Submits to /products?q=…, which the API
 * matches against product name, brand and category. Press "/" to focus.
 */
export function SearchForm({
  className,
  autoFocus,
  onSubmitted,
  shortcut = false,
}: SearchFormProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // What the user is typing; null means "not edited", so the field mirrors ?q=
  // from the URL (back/forward, links, clearing filters) without an effect.
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? params.get('q') ?? '';
  const setValue = setDraft;
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
    setDraft(null);
    inputRef.current?.blur();
    onSubmitted?.();
  };

  return (
    <form role="search" onSubmit={submit} className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
        aria-hidden
      />
      <input
        ref={inputRef}
        id={id}
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search laptops, monitors, audio…"
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
        maxLength={100}
        className={cn(
          'h-10 w-full rounded-full border border-border bg-sunken pl-9 pr-16 text-sm text-fg placeholder:text-fg-muted',
          'transition-[border-color,background-color] duration-fast hover:border-border-strong',
          'focus-visible:border-accent focus-visible:outline-offset-0 [&::-webkit-search-cancel-button]:hidden',
        )}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="rounded-full p-1 text-fg-muted transition-colors duration-fast hover:bg-accent-soft hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : (
          shortcut && (
            <kbd
              className="eh-numeric hidden rounded-xs border border-border px-1.5 text-xs text-fg-muted lg:inline"
              aria-hidden
            >
              /
            </kbd>
          )
        )}
      </div>
    </form>
  );
}
