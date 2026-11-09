# ElectroHub component library

This folder holds the reusable building blocks of the storefront. Every component:

- uses only **design tokens**: the Tailwind utilities from `styles/theme.css` (`bg-surface`,
  `text-fg-muted`, `rounded-lg`, `shadow-md`, `duration-fast`, …) or `var(--eh-…)`, so dark
  and light themes work automatically;
- is **accessible by default**, with semantic elements, real labels, ARIA wiring and visible
  `:focus-visible` rings;
- has a live demo with all its variants and states at **`/design`** (development only).

```
components/
├── ui/          Generic primitives (import from '@/components/ui')
├── commerce/    Store-specific pieces: ProductCard, ProductImage, Price, CartDrawer, …
├── layout/      App shell: Navbar, Footer, Layout, Logo, SearchForm, ThemeToggle, CategoryMenu
└── ApiStatus    API/Redis health indicator (footer)
```

## Design tokens in one minute

| Need                          | Use                                                                        | Avoid                          |
| ----------------------------- | -------------------------------------------------------------------------- | ------------------------------ |
| Page / card / menu background | `bg-bg`, `bg-surface`, `bg-elevated`, `bg-sunken`                          | `bg-gray-900`, hex values      |
| Text                          | `text-fg`, `text-fg-secondary`, `text-fg-muted`                            | `text-white`, `text-slate-400` |
| Accent                        | `bg-accent`, `hover:bg-accent-hover`, `text-accent-text`, `bg-accent-soft` | `bg-blue-600`                  |
| Status                        | `text-success`, `bg-warning-soft`, `text-danger`                           | `text-green-500`               |
| Borders                       | `border-border`, `border-border-strong`                                    | `border-gray-800`              |
| Spacing                       | 4px grid: `p-4` = 16px, `gap-6` = 24px                                     | `p-[13px]`                     |
| Radius / shadow               | `rounded-md` (controls), `rounded-lg` (cards), `shadow-md`, `shadow-glow`  | `rounded-[10px]`               |
| Motion                        | `duration-fast`, `duration-base`, `duration-slow`, `ease-standard`         | `duration-150`                 |
| Prices and specs              | `<Price>` or the `.eh-numeric` class (JetBrains Mono, tabular figures)     | Inter for numbers in columns   |

`dark:` and `light:` variants follow the `data-theme` attribute (set on `<html>` by
`ThemeProvider`). Theme-specific colours belong in `tokens.css`, not in components.
Tailwind's default colour palette is switched off, so `bg-blue-500` doesn't compile.

---

## UI primitives (`@/components/ui`)

### Button / ButtonLink

```tsx
<Button>Add to cart</Button>
<Button variant="secondary" leftIcon={<ShoppingBag />}>Cart</Button>
<Button iconOnly aria-label="Remove item" variant="ghost"><Trash2 className="size-4" aria-hidden /></Button>
<Button loading loadingText="Saving order">Place order</Button>
<ButtonLink to="/products" rightIcon={<ArrowRight />}>Shop all</ButtonLink>
```

| Prop                                 | Values                                                            | Notes                                                             |
| ------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `variant`                            | `primary` · `secondary` · `outline` · `ghost` · `danger` · `link` | default `primary`                                                 |
| `size`                               | `sm` (32px) · `md` (40px) · `lg` (48px)                           |                                                                   |
| `iconOnly`                           | boolean                                                           | square; **requires `aria-label`** (warns in development)          |
| `loading`, `loadingText`             | boolean, string                                                   | keeps the width, shows a spinner, sets `aria-busy`, blocks clicks |
| `leftIcon`, `rightIcon`, `fullWidth` |                                                                   | icons are `aria-hidden`                                           |

- Defaults to `type="button"`, so it never submits a form by accident.
- Use `ButtonLink` for navigation and `Button` for actions.
- `buttonClasses()` returns the same class string for custom elements.

### Input · Select · Textarea

All three share the `Field` wrapper. It renders a `<label for>`, puts hint and error text
in `aria-describedby`, and sets `aria-invalid` when `error` is present.

```tsx
<Input label="Email" type="email" required error={errors.email} hint="For order updates." />
<Input label="Search" hideLabel leftIcon={<Search />} placeholder="Search…" />
<Select label="Sort by" options={[{ value: 'newest', label: 'Newest' }]} />
<Textarea label="Order note" maxLength={200} />  {/* shows "n / 200" */}
```

| Prop                               | Applies to    | Notes                                                                 |
| ---------------------------------- | ------------- | --------------------------------------------------------------------- |
| `label`, `hideLabel`               | all           | `hideLabel` keeps the label for screen readers only                   |
| `hint`, `error`, `required`        | all           | `required` shows `*`; also pass it to the input                       |
| `size`                             | Input, Select | `sm` · `md` · `lg`                                                    |
| `leftIcon`                         | Input, Select | decorative                                                            |
| `rightElement`, `loading`          | Input         | a clear button, a unit, or a spinner                                  |
| `options`, `placeholder`           | Select        | a native `<select>` keeps the mobile picker and full keyboard support |
| `maxLength`, `showCount`, `resize` | Textarea      | the counter turns amber at 90% and red at the limit                   |

To validate a form, render the errors and then move focus to the first
`[aria-invalid="true"]` field. The `/design` page has a working example.

### QuantityStepper

```tsx
<QuantityStepper
  value={qty}
  onChange={setQty}
  min={1}
  max={product.stock}
  label={`Quantity for ${product.name}`}
/>
```

- The input has `role="spinbutton"` and the `aria-valuenow`, `aria-valuemin` and
  `aria-valuemax` attributes.
- Keys: ↑/↓ change by 1, PageUp/PageDown by 10, Home/End jump to min/max. A typed value is
  committed on Enter or blur and clamped to the range; Esc reverts it.
- `loading` shows a spinner while the change is saved. `disabled` and `size` (`sm`, `md`)
  are also available.

### Card

```tsx
<Card as="article" variant="elevated" padding="lg" interactive>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
  </CardHeader>
  …
  <CardFooter>
    <Button size="sm">Action</Button>
  </CardFooter>
</Card>
```

- `variant`: `default` · `elevated` · `outline` · `ghost`.
- `padding`: `none` · `sm` · `md` · `lg`.
- `interactive` adds the hover lift. To make the whole card clickable, use a stretched link
  inside it rather than wrapping the card in an `<a>` (see ProductCard).

### Badge

```tsx
<Badge variant="success" dot>In stock</Badge>
<Badge variant="solid" icon={<Sparkles />}>Featured</Badge>
```

- `variant`: `neutral` · `accent` · `solid` · `success` · `warning` · `danger` · `outline`.
- `size`: `sm` · `md`.
- Put the meaning in the text. Colour alone isn't enough.

### Modal and Drawer

Both are built on the native `<dialog>` element through `useDialog`, which provides:

- a focus trap, and Esc closes the dialog through `onClose`;
- the page behind becomes inert and scroll is locked;
- focus returns to the element that opened it;
- the dialog sits in the top layer, so there's no z-index to manage.

```tsx
<Modal open={open} onClose={close} title="Cancel this order?" description="Items return to stock."
       role="alertdialog" closeOnBackdrop={false}
       footer={<><Button variant="secondary" onClick={close} data-autofocus>Keep</Button><Button variant="danger">Cancel order</Button></>} />

<Drawer open={open} onClose={close} side="right" size="md" title="Your cart" footer={<Totals />}>…</Drawer>
```

| Prop              | Modal                                      | Drawer                                          |
| ----------------- | ------------------------------------------ | ----------------------------------------------- |
| `size`            | `sm` (384px) · `md` (512px) · `lg` (704px) | `sm` · `md` · `lg` (full width on small phones) |
| `role`            | `dialog` · `alertdialog`                   | n/a                                             |
| `side`            | n/a                                        | `right` · `left`                                |
| `closeOnBackdrop` | default `true`                             | always on                                       |

Put `data-autofocus` on the element that should receive focus first; the safe choice is usually
the least destructive one.

### Toast

Wrap the app once in `<ToastProvider>` (done in `main.tsx`), then:

```tsx
const toast = useToast();
toast.success('Added to cart', product.name);
toast.error("Couldn't add to cart", error.message);
toast.toast({
  variant: 'info',
  title: 'Item removed',
  action: { label: 'Undo', onClick: undo },
  duration: 6000,
});
```

- **Placement:** toasts appear bottom-right, or bottom-centre on phones, at most 4 at a time.
- **Duration:** 4.5 s by default and 7 s for errors. Hovering or focusing a toast pauses
  its timer.
- **Announcements:** errors use `role="alert"` and are read out immediately. Everything
  else uses `role="status"` and is read out politely.

### Table

```tsx
<Table
  caption="Low stock"
  rows={items}
  getRowKey={(r) => r.id}
  loading={isLoading}
  sort={sort}
  onSortChange={setSort}
  empty={<EmptyState title="All stocked up" size="sm" />}
  columns={[
    { key: 'name', header: 'Product', sortable: true },
    { key: 'stock', header: 'Stock', numeric: true, sortable: true },
    { key: 'category', header: 'Category', hideBelow: 'md' },
  ]}
/>
```

- **Markup:** semantic `<table>` with a `<caption>` (visually hidden unless `showCaption`).
  Headers use `<th scope="col">`, and the first cell of each row is a row header.
- **Sorting:** sortable headers are buttons, and their `<th>` carries `aria-sort`.
- **Column options:** `numeric` right-aligns the column in monospace. `hideBelow`
  (`sm`, `md`, `lg`) drops lesser columns on phones.
- **Overflow:** wide tables scroll inside a focusable region, so keyboard users can scroll
  them.
- **Other props:** `loading` shows skeleton rows, `empty` replaces the body when there are
  no rows, `density` (`compact`, `comfortable`) sets row height, and `striped` alternates
  row shading.

### EmptyState

```tsx
<EmptyState
  icon={<ShoppingBag />}
  title="Your cart is empty"
  description="…"
  actions={<ButtonLink to="/products">Browse</ButtonLink>}
/>
```

It renders a `<section>` labelled by its heading. `headingLevel` (`h2`, `h3`) fits it into
the page outline, and `size` is `sm` or `md`.

### Skeleton · SkeletonGroup · Spinner

```tsx
<SkeletonGroup label="Loading products">     {/* announces "Loading products…" once */}
  <Skeleton className="aspect-[4/3] w-full" />
  <Skeleton shape="text" lines={2} />
</SkeletonGroup>
<Spinner size="sm" label="Saving" />          {/* label={null} when a parent already announces */}
```

- Skeletons are `aria-hidden`. Give each one the size of the content it stands in for, so
  the layout doesn't jump when data arrives.
- The shimmer stops under `prefers-reduced-motion`.

### Breadcrumbs

```tsx
<Breadcrumbs
  items={[
    { label: 'Products', href: '/products' },
    { label: 'Monitors', href: '/products?category=monitors' },
    { label: product.name },
  ]}
/>
```

It renders `<nav aria-label="Breadcrumb">` around an `<ol>`. "Home" is prepended (turn it
off with `showHome={false}`), the last item gets `aria-current="page"`, and long labels are
truncated with a tooltip.

---

### Checkbox

```tsx
<Checkbox
  label="Featured"
  description="Shown on the home page."
  checked={on}
  onChange={(e) => setOn(e.target.checked)}
/>
```

A native checkbox with a styled box. The label text is clickable, and `description` is
linked with `aria-describedby`.

### Pagination

```tsx
<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
```

Renders Previous, "page / total" and Next inside `<nav aria-label="Pagination">`. It
renders nothing when there's only one page.

---

## Commerce (`@/components/commerce`)

| Component                             | Purpose                                                                                                                                                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductCard` / `ProductCardSkeleton` | Grid tile: image, featured and stock badges, brand, name (stretched link), spec chips, `Price`, add-to-cart. One tab stop for the link plus the button. Pass `onAddToCart` and `adding`. Out-of-stock disables the button and says so in its label. |
| `ProductImage`                        | Product visual on a lit "stage". It shows real photos with `object-contain`, and falls back to the category illustration for placeholder URLs or failed loads. `aspect`, `priority` (eager load) and `zoomOnHover` are optional.                    |
| `ProductIllustration`                 | Line-art SVG per category, drawn in theme tokens.                                                                                                                                                                                                   |
| `Price`                               | Integer cents → `$1,899.00` in JetBrains Mono. `size`: `sm` · `md` · `lg` · `xl`. `muted` is optional.                                                                                                                                              |
| `StockBadge`, `stockState()`          | "Out of stock" / "Only N left" / "In stock". The threshold mirrors the server (5).                                                                                                                                                                  |
| `CartDrawer`                          | The cart panel: lines with `QuantityStepper`, remove, stock warnings, totals, free-shipping progress (`role="progressbar"`). Open it with `useCartUi().open()`.                                                                                     |

| Component          | Purpose                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OrderSummary`     | Line items, subtotal, shipping and total. Used on the checkout page and order pages.                                                                                                                          |
| `OrderStatusBadge` | The order status as a text badge (Pending, Paid, Shipped, Delivered, Cancelled).                                                                                                                              |
| `OrderProgress`    | The pending → paid → shipped → delivered tracker. Steps are an `<ol>`; finished and current steps are announced, and the current one has `aria-current="step"`. Cancelled orders get their own panel instead. |
| `OrderDetails`     | A full order: status with an `actions` slot, the tracker, items and totals, shipping address and contact. Shared by the shopper and admin order pages.                                                        |

## Admin (`@/components/admin`)

| Component                    | Purpose                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AdminLayout`                | The admin shell and auth guard. It checks the session with `GET /api/admin/me` and redirects to `/admin/login?next=…` without one. It shows a sidebar on laptops and up, and a top bar with a drawer below that. Also exports `AdminPageHeader`.                                               |
| `StatCard`                   | One headline figure: a label, the value in JetBrains Mono, and context text. `hero` makes it bigger; `tone="warning"` marks an alert, and the text explains it.                                                                                                                                |
| `BarList`                    | One measure across a few categories, for example orders by status or top sellers. It uses a single accent colour and plain-text labels and values, and gives no legend because there's only one series. Bars start at zero. Each row has a hover tooltip and is read as "Paid: 3 orders, 75%". |
| `ProductForm`, `SpecsEditor` | Product create/edit form with client validation that mirrors the server. Server errors are shown on the field they belong to. A live `ProductCard` preview sits beside the form. Specs are typed (text, number, yes/no, list), so numbers are stored as numbers.                               |

## Layout (`@/components/layout`)

| Component          | Notes                                                                                                                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Layout`           | The app shell. It includes a skip link ("Skip to content" → `#main`) and moves focus to `<main>` on navigation. It also renders `CartDrawer` and `ScrollRestoration`.                                                                                                                               |
| `Navbar`           | Sticky and translucent. **Desktop (≥ lg):** logo, Home, All products, a Categories menu with live counts, search, theme toggle and cart (badge, with an accessible name such as "Open cart, 3 items"). **Phones and tablets:** a menu button opens a left `Drawer`, and search sits on its own row. |
| `SearchForm`       | A `role="search"` form that submits to `/products?q=…`. Press `/` to focus it.                                                                                                                                                                                                                      |
| `CategoryMenu`     | Disclosure button (`aria-expanded`, `aria-controls`). It closes on Esc (returning focus to the button), outside click or navigation.                                                                                                                                                                |
| `ThemeToggle`      | Its label says what will happen ("Switch to light theme"). The choice is saved to `localStorage`, and an inline script in `index.html` applies it before first paint.                                                                                                                               |
| `Footer`           | Store promises, live category links, browse links and API/Redis status.                                                                                                                                                                                                                             |
| `Logo`, `LogoMark` | A link whose accessible name is "ElectroHub home".                                                                                                                                                                                                                                                  |

## Accessibility checklist for new components

1. Use the semantic element first (`button`, `a`, `nav`, `dialog`, `table`, `label`), and
   ARIA only to fill gaps.
2. Every interactive element needs an accessible name. Icon-only controls get
   `aria-label`, and icons get `aria-hidden`.
3. Never remove focus outlines. The global `:focus-visible` ring comes from `--eh-focus-ring`.
4. Don't convey state by colour alone. Text and icons carry the meaning.
5. Respect `prefers-reduced-motion`. Duration tokens drop to 0 automatically.
6. Check the result at 375px, 768px, 1024px and 1440px, and in both themes, on `/design`.
