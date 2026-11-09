import { useId } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

/** ElectroHub mark: a bolt in a rounded tile, drawn with theme tokens. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-8', className)}>
      <defs>
        <linearGradient id={`eh-logo-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--eh-accent-hover)" />
          <stop offset="1" stopColor="var(--eh-accent-active)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#eh-logo-${id})`} />
      <path d="M18.5 5 9 18h6l-1.5 9L23 14h-6z" fill="var(--eh-accent-contrast)" />
    </svg>
  );
}

/** Logo linking home. The accessible name is "ElectroHub home". */
export function Logo({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="ElectroHub home"
      className={cn('inline-flex items-center gap-2.5 rounded-md', className)}
    >
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight text-fg" aria-hidden>
        Electro<span className="text-accent-text">Hub</span>
      </span>
    </Link>
  );
}
