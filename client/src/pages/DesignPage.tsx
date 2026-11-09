/**
 * Development-only design system showcase (/design).
 * Registered in App.tsx only when import.meta.env.DEV is true and loaded with
 * React.lazy, so it is not part of the production bundle.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  Heart,
  Inbox,
  Mail,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useProducts } from '@/api/queries';
import type { Product } from '@/api/types';
import { Price } from '@/components/commerce/Price';
import { ProductCard, ProductCardSkeleton } from '@/components/commerce/ProductCard';
import { ProductIllustration } from '@/components/commerce/ProductIllustration';
import { LogoMark } from '@/components/layout/Logo';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Drawer,
  EmptyState,
  Input,
  Modal,
  QuantityStepper,
  Select,
  Skeleton,
  Spinner,
  Table,
  Textarea,
  useToast,
  type SortState,
} from '@/components/ui';
import { useAddToCartWithFeedback } from '@/hooks/useAddToCart';
import { cn } from '@/lib/cn';

// ── Token catalogue ───────────────────────────────────────────────────────
const COLOR_GROUPS: { title: string; tokens: [string, string][] }[] = [
  {
    title: 'Surfaces',
    tokens: [
      ['--eh-bg', 'Background'],
      ['--eh-surface', 'Surface'],
      ['--eh-surface-elevated', 'Elevated surface'],
      ['--eh-surface-sunken', 'Sunken (inputs)'],
    ],
  },
  {
    title: 'Borders & text',
    tokens: [
      ['--eh-border', 'Border'],
      ['--eh-border-strong', 'Border strong'],
      ['--eh-text-primary', 'Text primary'],
      ['--eh-text-secondary', 'Text secondary'],
      ['--eh-text-muted', 'Text muted'],
    ],
  },
  {
    title: 'Accent & status',
    tokens: [
      ['--eh-accent', 'Accent'],
      ['--eh-accent-hover', 'Accent hover'],
      ['--eh-accent-text', 'Accent text'],
      ['--eh-success', 'Success'],
      ['--eh-warning', 'Warning'],
      ['--eh-danger', 'Danger'],
      ['--eh-focus-ring', 'Focus ring'],
    ],
  },
];

const TYPE_SCALE = ['6xl', '5xl', '4xl', '3xl', '2xl', 'xl', 'lg', 'base', 'sm', 'xs'] as const;
const SPACING = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32];
const RADII = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'] as const;
const SHADOWS = ['xs', 'sm', 'md', 'lg', 'xl', 'glow'] as const;
const MOTION = [
  ['--eh-duration-fast', 'Fast: hovers, colour changes'],
  ['--eh-duration-base', 'Base: menus, toggles'],
  ['--eh-duration-slow', 'Slow: drawers, image zoom'],
] as const;
const BREAKPOINTS = [
  { name: 'sm', px: 640, use: 'Large phones' },
  { name: 'md', px: 768, use: 'Tablets: search moves into the navbar' },
  { name: 'lg', px: 1024, use: 'Laptops: full navigation, 3-column grids' },
  { name: 'xl', px: 1280, use: 'Desktops: 4-column grids, container max' },
  { name: '2xl', px: 1536, use: 'Large monitors' },
];

const SECTIONS = [
  ['colors', 'Colour'],
  ['typography', 'Typography'],
  ['spacing', 'Spacing & radii'],
  ['elevation', 'Elevation & motion'],
  ['breakpoints', 'Breakpoints'],
  ['buttons', 'Buttons'],
  ['forms', 'Form controls'],
  ['validation', 'Form validation'],
  ['feedback', 'Badges, spinners, skeletons'],
  ['cards', 'Cards'],
  ['products', 'Product cards'],
  ['overlays', 'Modal, drawer, toast'],
  ['data', 'Table, empty state, breadcrumbs'],
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────
function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="scroll-mt-24 border-t border-border py-12 first:border-t-0 first:pt-0"
    >
      <header className="mb-6 flex flex-col gap-1.5">
        <h2 id={`${id}-h`} className="text-2xl font-semibold text-fg">
          {title}
        </h2>
        {description && <p className="max-w-2xl text-sm text-fg-secondary">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function Demo({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</p>
      <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>
    </div>
  );
}

/** Renders the same content in a forced dark panel and a forced light panel. */
function ThemePair({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {(['dark', 'light'] as const).map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          className="rounded-xl border border-border bg-bg p-5 text-fg"
        >
          <p className="eh-eyebrow mb-4">{theme} theme</p>
          {children}
        </div>
      ))}
    </div>
  );
}

function Swatch({ token, label }: { token: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('');
  useEffect(() => {
    if (ref.current) setValue(getComputedStyle(ref.current).getPropertyValue(token).trim());
  }, [token]);
  return (
    <div ref={ref} className="flex items-center gap-3">
      <span
        className="size-10 shrink-0 rounded-md border border-border-strong shadow-xs"
        style={{ background: `var(${token})` }}
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className="eh-numeric truncate text-xs text-fg-muted">
          {token} · {value}
        </span>
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function DesignPage() {
  return (
    <div className="eh-container py-10 md:py-14">
      <header className="mb-12 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <Badge variant="warning">Development only</Badge>
        </div>
        <h1 className="text-4xl font-semibold text-fg">ElectroHub design system</h1>
        <p className="max-w-2xl text-fg-secondary">
          Every token and component in one place. Values come from{' '}
          <code className="eh-numeric text-sm">src/styles/tokens.css</code>; use the navbar toggle
          to switch the whole page, or compare both themes in the panels below.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="Design system sections" className="hidden lg:block">
          <ul className="sticky top-24 flex flex-col gap-1 text-sm">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="block rounded-md px-3 py-1.5 text-fg-secondary transition-colors duration-fast hover:bg-accent-soft hover:text-fg"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <ColorSection />
          <TypographySection />
          <SpacingSection />
          <ElevationSection />
          <BreakpointSection />
          <ButtonSection />
          <FormSection />
          <ValidationSection />
          <FeedbackSection />
          <CardSection />
          <ProductSection />
          <OverlaySection />
          <DataSection />
        </div>
      </div>
    </div>
  );
}

function ColorSection() {
  return (
    <Section
      id="colors"
      title="Colour"
      description="Semantic tokens only: components never use raw hex values. Text tokens meet WCAG AA on every surface in both themes."
    >
      <ThemePair>
        <div className="flex flex-col gap-6">
          {COLOR_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-fg">{group.title}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.tokens.map(([token, label]) => (
                  <Swatch key={token} token={token} label={label} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ThemePair>
    </Section>
  );
}

function TypographySection() {
  return (
    <Section
      id="typography"
      title="Typography"
      description="Inter for interface text; JetBrains Mono (tabular figures) for prices, SKUs and specifications."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="eh-eyebrow mb-2">Sans · --eh-font-sans</p>
          <p className="text-3xl font-semibold text-fg">Inter Variable</p>
          <p className="mt-2 text-fg-secondary">
            The quick brown fox jumps over the lazy dog. 0123456789
          </p>
          <p className="mt-3 flex gap-4 text-sm text-fg-secondary">
            <span className="font-normal">Regular 400</span>
            <span className="font-medium">Medium 500</span>
            <span className="font-semibold">Semibold 600</span>
            <span className="font-bold">Bold 700</span>
          </p>
        </Card>
        <Card>
          <p className="eh-eyebrow mb-2">Mono · --eh-font-mono</p>
          <p className="eh-numeric text-3xl font-semibold text-fg">$2,199.99</p>
          <p className="eh-numeric mt-2 text-fg-secondary">
            RTX 5070 Ti · 32 GB · 240 Hz · 0.03 ms
          </p>
          <p className="mt-3 text-sm text-fg-muted">
            Tabular figures keep prices aligned in columns.
          </p>
        </Card>
      </div>
      <Card padding="none" className="mt-4 divide-y divide-border">
        {TYPE_SCALE.map((size) => (
          <div key={size} className="flex items-baseline gap-6 px-5 py-3">
            <span className="eh-numeric w-28 shrink-0 text-xs text-fg-muted">
              text-{size}
              <br />
              --eh-text-{size}
            </span>
            <span className={cn('truncate font-semibold text-fg', `text-${size}`)}>
              Premium electronics
            </span>
          </div>
        ))}
      </Card>
    </Section>
  );
}

function SpacingSection() {
  return (
    <Section
      id="spacing"
      title="Spacing & radii"
      description="Everything sits on a 4px grid: Tailwind's spacing unit is --eh-space-unit (0.25rem), so p-4 = 16px."
    >
      <Card padding="none" className="divide-y divide-border">
        {SPACING.map((n) => (
          <div key={n} className="flex items-center gap-4 px-5 py-2">
            <span className="eh-numeric w-28 shrink-0 text-xs text-fg-muted">
              --eh-space-{n} · {n * 4}px
            </span>
            <span className="h-3 rounded-xs bg-accent" style={{ width: `var(--eh-space-${n})` }} />
          </div>
        ))}
      </Card>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {RADII.map((r) => (
          <div key={r} className="flex flex-col items-center gap-2">
            <span className={cn('size-16 border-2 border-accent bg-accent-soft', `rounded-${r}`)} />
            <span className="eh-numeric text-xs text-fg-muted">radius-{r}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ElevationSection() {
  return (
    <Section
      id="elevation"
      title="Elevation & motion"
      description="Shadows are deeper in dark mode, where contrast comes from light. Motion durations drop to 0 for prefers-reduced-motion."
    >
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
        {SHADOWS.map((s) => (
          <div
            key={s}
            className={cn(
              'flex h-24 items-end rounded-lg border border-border bg-elevated p-3',
              `shadow-${s}`,
            )}
          >
            <span className="eh-numeric text-xs text-fg-muted">shadow-{s}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {MOTION.map(([token, label]) => (
          <div key={token} className="group rounded-lg border border-border bg-surface p-4">
            <p className="eh-numeric text-xs text-fg-muted">{token}</p>
            <p className="mb-4 text-sm text-fg-secondary">{label}</p>
            <div className="h-2 rounded-full bg-sunken">
              <div
                className="h-2 w-6 rounded-full bg-accent transition-[width] group-hover:w-full"
                style={{
                  transitionDuration: `var(${token})`,
                  transitionTimingFunction: 'var(--eh-ease-standard)',
                }}
              />
            </div>
            <p className="mt-2 text-xs text-fg-muted">Hover to play</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function BreakpointSection() {
  return (
    <Section
      id="breakpoints"
      title="Breakpoints"
      description="Mobile first: base styles target phones; sm/md/lg/xl/2xl add layout as space allows."
    >
      <Table
        caption="Responsive breakpoints"
        rows={BREAKPOINTS}
        getRowKey={(b) => b.name}
        columns={[
          {
            key: 'name',
            header: 'Prefix',
            cell: (b) => <code className="eh-numeric">{b.name}:</code>,
          },
          { key: 'px', header: 'Min width', numeric: true, cell: (b) => `${b.px}px` },
          {
            key: 'token',
            header: 'Token',
            hideBelow: 'sm',
            cell: (b) => <code className="eh-numeric text-xs">--eh-bp-{b.name}</code>,
          },
          { key: 'use', header: 'Typical use', hideBelow: 'md' },
        ]}
      />
    </Section>
  );
}

function ButtonSection() {
  const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger', 'link'] as const;
  return (
    <Section
      id="buttons"
      title="Buttons"
      description="Six variants, three sizes, icon-only, loading (keeps width, sets aria-busy) and disabled. ButtonLink renders a router link with the same styles."
    >
      <ThemePair>
        <div className="flex flex-col gap-6">
          <Demo label="Variants">
            {variants.map((v) => (
              <Button key={v} variant={v}>
                {v[0]!.toUpperCase() + v.slice(1)}
              </Button>
            ))}
          </Demo>
          <Demo label="Sizes">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Demo>
          <Demo label="With icons · icon only">
            <Button leftIcon={<ShoppingBag />}>Add to cart</Button>
            <Button variant="secondary" rightIcon={<ArrowRight />}>
              Continue
            </Button>
            <Button variant="outline" iconOnly aria-label="Add to wishlist">
              <Heart className="size-4" aria-hidden />
            </Button>
            <Button variant="ghost" iconOnly size="sm" aria-label="Delete">
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </Demo>
          <Demo label="Loading · disabled">
            <Button loading>Saving</Button>
            <Button variant="secondary" loading>
              Loading
            </Button>
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled
            </Button>
          </Demo>
        </div>
      </ThemePair>
    </Section>
  );
}

function FormSection() {
  const [qty, setQty] = useState(2);
  return (
    <Section
      id="forms"
      title="Form controls"
      description="Every control renders a real <label>, links hint and error text with aria-describedby and sets aria-invalid on error."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-5">
          <Input label="Full name" placeholder="Alex Nguyen" hint="As it appears on your ID." />
          <Input label="Search" hideLabel placeholder="Search products…" leftIcon={<Search />} />
          <Input
            label="Email"
            type="email"
            leftIcon={<Mail />}
            defaultValue="alex@example"
            error="Enter a valid email address."
          />
          <Input label="Checking availability" loading defaultValue="ROG Strix" />
          <Input label="Disabled" disabled defaultValue="Can't edit this" />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Small" size="sm" placeholder="sm" />
            <Input label="Medium" size="md" placeholder="md" />
            <Input label="Large" size="lg" placeholder="lg" />
          </div>
        </Card>
        <Card className="flex flex-col gap-5">
          <Select
            label="Category"
            placeholder="Choose a category"
            options={[
              { value: 'laptops', label: 'Laptops' },
              { value: 'monitors', label: 'Monitors' },
              { value: 'mice', label: 'Mice' },
            ]}
          />
          <Select
            label="Sort"
            leftIcon={<Sparkles />}
            options={[
              { value: 'n', label: 'Newest' },
              { value: 'p', label: 'Price: low to high' },
            ]}
          />
          <Select label="Disabled" disabled options={[{ value: 'x', label: 'Unavailable' }]} />
          <Textarea
            label="Order note"
            placeholder="Leave at the front desk…"
            maxLength={120}
            hint="Optional. Shown to the courier."
          />
          <Demo label="Quantity stepper: sizes, bounds, loading, disabled">
            <QuantityStepper value={qty} onChange={setQty} min={1} max={5} label="Demo quantity" />
            <QuantityStepper value={1} onChange={() => undefined} size="sm" label="Small stepper" />
            <QuantityStepper value={3} onChange={() => undefined} loading label="Loading stepper" />
            <QuantityStepper
              value={1}
              onChange={() => undefined}
              disabled
              label="Disabled stepper"
            />
          </Demo>
          <p className="text-xs text-fg-muted">
            Try ↑/↓, PageUp/PageDown, Home/End, or type a number and press Enter (max 5).
          </p>
        </Card>
      </div>
    </Section>
  );
}

function ValidationSection() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const next: Record<string, string> = {};
    if (!String(data.get('name') ?? '').trim()) next.name = 'Name is required.';
    if (!/^\S+@\S+\.\S+$/.test(String(data.get('email') ?? '')))
      next.email = 'Enter a valid email address.';
    if (!data.get('country')) next.country = 'Choose a country.';
    if (String(data.get('postcode') ?? '').trim().length < 3)
      next.postcode = 'Postcode looks too short.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      // After React renders the errors, move focus to the first invalid field.
      requestAnimationFrame(() =>
        form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Address saved', 'This demo form only validates on the client.');
    }, 900);
  };

  return (
    <Section
      id="validation"
      title="Form validation"
      description="Submit empty to see error states. Focus moves to the first invalid field; messages are linked to their inputs."
    >
      <Card className="max-w-2xl">
        <form noValidate onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          <Input name="name" label="Full name" required error={errors.name} autoComplete="name" />
          <Input
            name="email"
            type="email"
            label="Email"
            required
            error={errors.email}
            autoComplete="email"
          />
          <Select
            name="country"
            label="Country"
            required
            placeholder="Select…"
            defaultValue=""
            error={errors.country}
            options={[
              { value: 'VN', label: 'Vietnam' },
              { value: 'US', label: 'United States' },
              { value: 'GB', label: 'United Kingdom' },
            ]}
          />
          <Input
            name="postcode"
            label="Postcode"
            required
            error={errors.postcode}
            autoComplete="postal-code"
          />
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit" loading={submitting}>
              Save address
            </Button>
            <Button type="reset" variant="ghost" onClick={() => setErrors({})}>
              Reset
            </Button>
          </div>
        </form>
      </Card>
    </Section>
  );
}

function FeedbackSection() {
  return (
    <Section id="feedback" title="Badges, spinners, skeletons">
      <ThemePair>
        <div className="flex flex-col gap-6">
          <Demo label="Badges">
            <Badge>Neutral</Badge>
            <Badge variant="accent">New</Badge>
            <Badge variant="solid" icon={<Sparkles />}>
              Featured
            </Badge>
            <Badge variant="success" dot>
              In stock
            </Badge>
            <Badge variant="warning" dot>
              Only 2 left
            </Badge>
            <Badge variant="danger" dot>
              Out of stock
            </Badge>
            <Badge variant="outline" size="sm">
              Small
            </Badge>
          </Demo>
          <Demo label="Spinners">
            <Spinner size="xs" />
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" className="text-accent-text" />
          </Demo>
          <Demo label="Skeletons" className="items-start">
            <Skeleton shape="circle" className="size-12" />
            <div className="w-56">
              <Skeleton shape="text" lines={3} />
            </div>
            <Skeleton className="h-20 w-32" />
          </Demo>
        </div>
      </ThemePair>
    </Section>
  );
}

function CardSection() {
  return (
    <Section
      id="cards"
      title="Cards"
      description="Default, elevated, outline and ghost surfaces; `interactive` adds hover lift for clickable cards."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(['default', 'elevated', 'outline', 'ghost'] as const).map((variant) => (
          <Card key={variant} variant={variant} interactive={variant === 'default'}>
            <CardHeader>
              <CardTitle>{variant[0]!.toUpperCase() + variant.slice(1)}</CardTitle>
              <CardDescription>
                {variant === 'default' ? 'Interactive: hover me.' : `variant="${variant}"`}
              </CardDescription>
            </CardHeader>
            <p className="text-sm text-fg-secondary">
              Cards group related content on the surface colour.
            </p>
            <CardFooter>
              <Button size="sm" variant="secondary">
                Action
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function ProductSection() {
  const products = useProducts({ limit: 50 });
  const { add, pendingId } = useAddToCartWithFeedback();
  const picks = useMemo(() => {
    const list = products.data?.data ?? [];
    const pick = (fn: (p: Product) => boolean) => list.find(fn);
    return [
      pick((p) => p.featured && p.stock > 5),
      pick((p) => p.stock > 0 && p.stock <= 5),
      pick((p) => p.stock === 0),
    ].filter((p): p is Product => Boolean(p));
  }, [products.data]);

  return (
    <Section
      id="products"
      title="Product cards"
      description="Live products from the API: featured, low stock and out of stock, plus the loading skeleton. 'Add' really adds to your cart."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {products.isPending
          ? Array.from({ length: 3 }, (_, i) => <ProductCardSkeleton key={i} />)
          : picks.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={add} adding={pendingId === p.id} />
            ))}
        <ProductCardSkeleton />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {(
          [
            'gaming-laptops',
            'laptops',
            'pcs',
            'mice',
            'monitors',
            'headphones',
            'microphones',
          ] as const
        ).map((c) => (
          <div
            key={c}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-linear-to-b from-stage-from to-stage-to p-3 text-fg-muted"
          >
            <ProductIllustration category={c} />
            <span className="eh-numeric text-xs">{c}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function OverlaySection() {
  const [modal, setModal] = useState<'none' | 'info' | 'confirm'>('none');
  const [drawer, setDrawer] = useState<'none' | 'right' | 'left'>('none');
  const toast = useToast();
  return (
    <Section
      id="overlays"
      title="Modal, drawer, toast"
      description="Built on native <dialog>: focus is trapped, Esc closes, the page behind is inert, and focus returns to the trigger."
    >
      <div className="flex flex-col gap-6">
        <Demo label="Modal">
          <Button variant="secondary" onClick={() => setModal('info')}>
            Open modal
          </Button>
          <Button variant="danger" onClick={() => setModal('confirm')}>
            Open confirmation
          </Button>
        </Demo>
        <Demo label="Drawer">
          <Button variant="secondary" onClick={() => setDrawer('right')}>
            Right drawer
          </Button>
          <Button variant="secondary" onClick={() => setDrawer('left')}>
            Left drawer
          </Button>
        </Demo>
        <Demo label="Toast">
          <Button
            variant="outline"
            onClick={() => toast.success('Added to cart', 'Sony WH-1000XM5')}
          >
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info('Price dropped', 'LG UltraGear 27GR95QE is now $799.99')}
          >
            Info
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.toast({
                variant: 'warning',
                title: 'Only 2 left',
                description: 'Sennheiser HD 660S2',
              })
            }
          >
            Warning
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.error(
                "Couldn't add to cart",
                'Only 1 unit(s) of "lenovo-thinkpad-x1-carbon-gen12" in stock',
              )
            }
          >
            Error
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.toast({
                title: 'Item removed',
                description: 'Logitech MX Master 3S',
                action: { label: 'Undo', onClick: () => toast.info('Restored') },
              })
            }
          >
            With action
          </Button>
        </Demo>
      </div>

      <Modal
        open={modal === 'info'}
        onClose={() => setModal('none')}
        title="Free shipping unlocked"
        description="Orders over $100 ship free to anywhere we deliver."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal('none')}>
              Close
            </Button>
            <Button onClick={() => setModal('none')} data-autofocus>
              Got it
            </Button>
          </>
        }
      >
        Shipping is a flat $9.99 below the threshold. Delivery estimates are shown at checkout.
      </Modal>
      <Modal
        open={modal === 'confirm'}
        onClose={() => setModal('none')}
        role="alertdialog"
        size="sm"
        closeOnBackdrop={false}
        title="Cancel this order?"
        description="Items go back into stock immediately. This can't be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal('none')} data-autofocus>
              Keep order
            </Button>
            <Button variant="danger" onClick={() => setModal('none')}>
              Cancel order
            </Button>
          </>
        }
      />
      <Drawer
        open={drawer !== 'none'}
        onClose={() => setDrawer('none')}
        side={drawer === 'left' ? 'left' : 'right'}
        title={drawer === 'left' ? 'Filters' : 'Panel'}
        description="Drawers hold secondary tasks without leaving the page."
        footer={
          <Button fullWidth onClick={() => setDrawer('none')}>
            Apply
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Brand" placeholder="e.g. Logitech" />
          <Select label="Sort" options={[{ value: 'n', label: 'Newest' }]} />
          <Skeleton shape="text" lines={6} />
        </div>
      </Drawer>
    </Section>
  );
}

function DataSection() {
  const products = useProducts({ limit: 50 });
  const [sort, setSort] = useState<SortState>({ key: 'price', direction: 'desc' });
  const rows = useMemo(() => {
    const list = [...(products.data?.data ?? [])].slice(0, 8);
    const dir = sort.direction === 'asc' ? 1 : -1;
    return list.sort((a, b) =>
      sort.key === 'name'
        ? a.name.localeCompare(b.name) * dir
        : sort.key === 'stock'
          ? (a.stock - b.stock) * dir
          : (a.priceCents - b.priceCents) * dir,
    );
  }, [products.data, sort]);

  return (
    <Section id="data" title="Table, empty state, breadcrumbs">
      <div className="flex flex-col gap-8">
        <Table
          caption="Products (live, sortable)"
          showCaption
          rows={rows}
          loading={products.isPending}
          getRowKey={(p) => p.id}
          sort={sort}
          onSortChange={setSort}
          columns={[
            { key: 'name', header: 'Product', sortable: true },
            { key: 'brand', header: 'Brand', hideBelow: 'sm' },
            { key: 'category', header: 'Category', hideBelow: 'md' },
            { key: 'stock', header: 'Stock', numeric: true, sortable: true },
            {
              key: 'price',
              header: 'Price',
              numeric: true,
              sortable: true,
              cell: (p) => <Price cents={p.priceCents} size="sm" />,
            },
          ]}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Table
            caption="Loading state"
            showCaption
            loading
            loadingRows={3}
            rows={[]}
            getRowKey={() => 0}
            columns={[
              { key: 'a', header: 'Order' },
              { key: 'b', header: 'Total', numeric: true },
            ]}
          />
          <Table
            caption="Empty state"
            showCaption
            rows={[]}
            getRowKey={() => 0}
            columns={[
              { key: 'a', header: 'Order' },
              { key: 'b', header: 'Total', numeric: true },
            ]}
            empty={
              <EmptyState
                size="sm"
                headingLevel="h3"
                icon={<Inbox />}
                title="No orders yet"
                description="Orders appear here after checkout."
              />
            }
          />
        </div>
        <Card>
          <EmptyState
            headingLevel="h3"
            icon={<ShoppingBag />}
            title="Your cart is empty"
            description="Browse the catalogue and add something you'll love."
            actions={
              <>
                <Button leftIcon={<Plus />}>Browse products</Button>
                <Button variant="ghost">View featured</Button>
              </>
            }
          />
        </Card>
        <Demo label="Breadcrumbs">
          <Breadcrumbs
            items={[
              { label: 'Products', href: '/products' },
              { label: 'Monitors', href: '/products?category=monitors' },
              { label: 'Samsung Odyssey OLED G9 (G95SC)' },
            ]}
          />
        </Demo>
      </div>
    </Section>
  );
}
