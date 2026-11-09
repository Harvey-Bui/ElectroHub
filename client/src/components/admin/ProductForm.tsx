import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import type { Category, Product, ProductInput } from '@/api/types';
import { ProductCard } from '@/components/commerce/ProductCard';
import { ButtonLink, Button, Checkbox, Input, Select, Textarea } from '@/components/ui';
import { formFromProduct, parseProductForm, type ProductFormState } from '@/lib/productForm';
import { showErrorsAndFocus, type FieldErrors } from '@/lib/validation';
import { SpecsEditor } from './SpecsEditor';

export interface ProductFormProps {
  mode: 'create' | 'edit';
  product?: Product;
  categories: Category[];
  saving: boolean;
  /** Errors from the server (already mapped to form field names). */
  serverErrors?: FieldErrors;
  onSubmit: (input: ProductInput) => void;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const id = `section-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <fieldset
      aria-labelledby={id}
      className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 md:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-base font-semibold text-fg">
          {title}
        </h2>
        {description && <p className="text-sm text-fg-muted">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}

/**
 * Create / edit form for a product, with a live ProductCard preview of
 * exactly what shoppers will see. Validates on the client with the server's
 * limits, then shows any server-side errors in place.
 */
export function ProductForm({
  mode,
  product,
  categories,
  saving,
  serverErrors = {},
  onSubmit,
}: ProductFormProps) {
  const [form, setForm] = useState<ProductFormState>(() => formFromProduct(product));
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const errors = { ...serverErrors, ...clientErrors };

  const set = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (clientErrors[key as string]) setClientErrors(({ [key as string]: _drop, ...rest }) => rest);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const { errors: found, input } = parseProductForm(form, mode);
    if (!input) {
      showErrorsAndFocus(setClientErrors, found, formRef.current);
      return;
    }
    setClientErrors({});
    onSubmit(input);
  };

  // Live preview built from whatever is valid so far.
  const preview = useMemo<Product>(() => {
    const parsed = parseProductForm(form, mode).input;
    const priceCents = Math.round(Number(form.price) * 100);
    return {
      id: product?.id ?? (form.id || 'preview'),
      name: form.name || 'Product name',
      brand: form.brand || 'Brand',
      brandSlug: '',
      category: (form.category || 'laptops') as Product['category'],
      description: form.description,
      priceCents: Number.isFinite(priceCents) ? priceCents : 0,
      stock: Number(form.stock) || 0,
      specs: parsed?.specs ?? {},
      imageUrl: form.imageUrl || 'https://placehold.co/800x600/png',
      featured: form.featured,
      createdAt: product?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [form, mode, product]);

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_20rem]">
      <form
        ref={formRef}
        noValidate
        onSubmit={submit}
        aria-label={mode === 'create' ? 'New product' : 'Edit product'}
        className="flex flex-col gap-6"
      >
        <Section title="Basics">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              error={errors.name}
              maxLength={200}
              wrapperClassName="sm:col-span-2"
            />
            <Input
              label="Brand"
              required
              value={form.brand}
              onChange={(e) => set('brand', e.target.value)}
              error={errors.brand}
              maxLength={80}
            />
            <Select
              label="Category"
              required
              placeholder="Choose a category"
              value={form.category}
              onChange={(e) => set('category', e.target.value as ProductFormState['category'])}
              options={categories.map((c) => ({ value: c.slug, label: c.name }))}
              error={errors.category}
            />
            {mode === 'create' ? (
              <Input
                label="Product ID"
                value={form.id}
                onChange={(e) => set('id', e.target.value)}
                error={errors.id}
                hint="Optional. Used in the URL; generated from the name if empty. Can't be changed later."
                placeholder="e.g. razer-viper-v3-pro"
                className="eh-numeric"
                wrapperClassName="sm:col-span-2"
              />
            ) : (
              <Input
                label="Product ID"
                value={form.id}
                readOnly
                hint="IDs are permanent."
                className="eh-numeric"
                wrapperClassName="sm:col-span-2"
              />
            )}
          </div>
          <Textarea
            label="Description"
            required
            rows={4}
            maxLength={5000}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            error={errors.description}
          />
        </Section>

        <Section
          title="Pricing & stock"
          description="Stock changes here are applied atomically, along with the low-stock alerts."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Price (USD)"
              required
              inputMode="decimal"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              error={errors.price}
              leftIcon={<span className="eh-numeric text-sm">$</span>}
              placeholder="0.00"
              className="eh-numeric"
            />
            <Input
              label="Units in stock"
              required
              inputMode="numeric"
              value={form.stock}
              onChange={(e) => set('stock', e.target.value)}
              error={errors.stock}
              className="eh-numeric"
            />
          </div>
        </Section>

        <Section title="Media & visibility">
          <Input
            label="Image URL"
            required
            type="url"
            value={form.imageUrl}
            onChange={(e) => set('imageUrl', e.target.value)}
            error={errors.imageUrl}
            hint="Placeholder images show the category illustration instead."
          />
          <Checkbox
            label="Featured"
            description="Shown on the home page and in the Featured collection."
            checked={form.featured}
            onChange={(e) => set('featured', e.target.checked)}
          />
        </Section>

        <Section
          title="Specifications"
          description="Stored as JSON on the product. Numbers stay numbers, so they sort and format correctly."
        >
          <SpecsEditor
            rows={form.specs}
            onChange={(specs) => set('specs', specs)}
            errors={errors}
          />
        </Section>

        <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-border bg-bg/90 px-4 py-4 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-5">
          <ButtonLink to="/admin/products" variant="ghost">
            Cancel
          </ButtonLink>
          <Button type="submit" loading={saving} loadingText="Saving product" leftIcon={<Save />}>
            {mode === 'create' ? 'Create product' : 'Save changes'}
          </Button>
        </div>
      </form>

      <aside aria-label="Preview" className="xl:sticky xl:top-8 xl:self-start">
        <p className="eh-eyebrow mb-3">Live preview</p>
        <div className="pointer-events-none max-w-xs" inert>
          <ProductCard product={preview} headingLevel="h3" />
        </div>
      </aside>
    </div>
  );
}
