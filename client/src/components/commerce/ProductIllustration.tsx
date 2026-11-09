import { useId, type ReactNode } from 'react';
import type { CategorySlug } from '@/api/types';
import { cn } from '@/lib/cn';

/**
 * Line-art illustrations per category, drawn in theme tokens (outline =
 * currentColor, highlights = accent). Shown when a product has no real photo.
 */
export function ProductIllustration({
  category,
  className,
}: {
  category: CategorySlug;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const screen = `screen-${uid}`;
  const glow = `glow-${uid}`;

  const defs = (
    <defs>
      <linearGradient id={screen} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--eh-accent)" stopOpacity="0.55" />
        <stop offset="0.55" stopColor="var(--eh-accent)" stopOpacity="0.12" />
        <stop offset="1" stopColor="var(--eh-accent-text)" stopOpacity="0.35" />
      </linearGradient>
      <linearGradient id={glow} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="var(--eh-accent-text)" />
        <stop offset="1" stopColor="var(--eh-accent)" />
      </linearGradient>
    </defs>
  );
  const S = `url(#${screen})`;
  const G = `url(#${glow})`;

  const art: Record<CategorySlug, ReactNode> = {
    laptops: (
      <>
        <rect x="58" y="24" width="124" height="82" rx="6" />
        <rect x="64" y="30" width="112" height="70" rx="2" fill={S} stroke="none" />
        <path d="M78 52h40M78 60h62M78 68h28" stroke="var(--eh-accent-text)" strokeOpacity="0.5" />
        <path d="M40 112h160l-8 12H48z" />
        <path d="M106 112h28" stroke={G} strokeWidth="3" />
      </>
    ),
    'gaming-laptops': (
      <>
        <rect x="54" y="20" width="132" height="86" rx="6" />
        <rect x="60" y="26" width="120" height="74" rx="2" fill={S} stroke="none" />
        <path
          d="M92 86l26-36 12 16 12-10 18 30"
          stroke="var(--eh-accent-text)"
          strokeOpacity="0.7"
        />
        <path d="M34 112h172l-10 16H44z" />
        <path d="M58 119h124" stroke={G} strokeWidth="3" strokeLinecap="round" />
        <path
          d="M70 100h8M84 100h8M148 100h8M162 100h8"
          stroke="var(--eh-accent-text)"
          strokeOpacity="0.5"
        />
      </>
    ),
    pcs: (
      <>
        <rect x="76" y="14" width="88" height="132" rx="6" />
        <rect x="84" y="22" width="56" height="116" rx="3" fill={S} stroke="none" opacity="0.6" />
        {[48, 80, 112].map((cy) => (
          <g key={cy}>
            <circle cx="112" cy={cy} r="12" stroke={G} strokeWidth="2.5" />
            <circle cx="112" cy={cy} r="3" fill="currentColor" stroke="none" />
          </g>
        ))}
        <path d="M150 24v112" />
        <circle cx="157" cy="30" r="2.5" fill="var(--eh-accent-text)" stroke="none" />
        <path d="M86 146v6M154 146v6" />
      </>
    ),
    mice: (
      <>
        <path d="M120 22c30 0 44 26 44 62 0 38-18 58-44 58s-44-20-44-58c0-36 14-62 44-62z" />
        <path d="M120 22v50M77 72c14 6 29 8 43 8s29-2 43-8" />
        <rect x="115" y="40" width="10" height="20" rx="5" fill={G} stroke="none" />
        <path d="M80 98c4 22 16 36 40 38" stroke={G} strokeWidth="2.5" opacity="0.8" />
      </>
    ),
    monitors: (
      <>
        <rect x="26" y="18" width="188" height="108" rx="6" />
        <rect x="32" y="24" width="176" height="94" rx="2" fill={S} stroke="none" />
        <path
          d="M32 96c40-28 70 6 104-14s52-30 72-20"
          stroke="var(--eh-accent-text)"
          strokeOpacity="0.6"
        />
        <path d="M110 126l-4 16h28l-4-16M90 144h60" />
      </>
    ),
    headphones: (
      <>
        <path d="M64 100V86c0-34 25-60 56-60s56 26 56 60v14" />
        <path d="M70 82c2-28 23-48 50-48s48 20 50 48" stroke={G} strokeWidth="2.5" opacity="0.7" />
        <rect x="50" y="92" width="30" height="48" rx="13" />
        <rect x="160" y="92" width="30" height="48" rx="13" />
        <rect x="58" y="100" width="14" height="32" rx="7" fill={S} stroke="none" />
        <rect x="168" y="100" width="14" height="32" rx="7" fill={S} stroke="none" />
      </>
    ),
    microphones: (
      <>
        <rect x="100" y="16" width="40" height="72" rx="20" />
        <rect x="100" y="16" width="40" height="72" rx="20" fill={S} stroke="none" opacity="0.7" />
        {[32, 40, 48, 56, 64, 72].map((y) => (
          <path key={y} d={`M106 ${y}h28`} stroke="currentColor" strokeOpacity="0.45" />
        ))}
        <path d="M86 62v12c0 20 15 34 34 34s34-14 34-34V62" />
        <path d="M120 108v28M96 142h48" />
        <path d="M120 88v6" stroke={G} strokeWidth="3" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 240 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn('h-auto w-full', className)}
    >
      {defs}
      {art[category]}
    </svg>
  );
}
