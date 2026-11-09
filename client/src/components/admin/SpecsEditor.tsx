import { useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import { newSpecRow, type SpecRow, type SpecType } from '@/lib/productForm';
import { specLabel } from '@/lib/specs';
import type { FieldErrors } from '@/lib/validation';

const TYPES: { value: SpecType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes / no' },
  { value: 'list', label: 'List' },
];

/**
 * Key/value editor for the flexible `specs` JSON. Each row has a name, a
 * type (so numbers stay numbers in Redis) and a value. New rows get focus.
 */
export function SpecsEditor({
  rows,
  onChange,
  errors,
}: {
  rows: SpecRow[];
  onChange: (rows: SpecRow[]) => void;
  errors: FieldErrors;
}) {
  const focusUid = useRef<string | null>(null);
  useEffect(() => {
    if (!focusUid.current) return;
    document.getElementById(`${focusUid.current}-key`)?.focus();
    focusUid.current = null;
  }, [rows.length]);

  const update = (uid: string, patch: Partial<SpecRow>) =>
    onChange(rows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));

  const add = () => {
    const row = newSpecRow();
    focusUid.current = row.uid;
    onChange([...rows, row]);
  };

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
          No specifications yet. Add details like processor, refresh rate or weight.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <li
            key={row.uid}
            className="grid gap-2 rounded-lg border border-border bg-sunken/40 p-3 sm:grid-cols-[1fr_8rem_1.2fr_auto] sm:items-start"
          >
            <Input
              id={`${row.uid}-key`}
              size="sm"
              label={`Name of specification ${i + 1}`}
              hideLabel
              placeholder="e.g. refreshHz"
              value={row.key}
              onChange={(e) => update(row.uid, { key: e.target.value })}
              error={errors[`spec.${row.uid}.key`]}
              hint={
                row.key && !errors[`spec.${row.uid}.key`]
                  ? `Shown as “${specLabel(row.key)}”`
                  : undefined
              }
            />
            <Select
              size="sm"
              label={`Type of specification ${i + 1}`}
              hideLabel
              value={row.type}
              options={TYPES}
              onChange={(e) => {
                const type = e.target.value as SpecType;
                update(row.uid, {
                  type,
                  value: type === 'boolean' ? 'true' : row.type === 'boolean' ? '' : row.value,
                });
              }}
            />
            {row.type === 'boolean' ? (
              <Select
                size="sm"
                label={`Value of specification ${i + 1}`}
                hideLabel
                value={row.value === 'true' ? 'true' : 'false'}
                options={[
                  { value: 'true', label: 'Yes' },
                  { value: 'false', label: 'No' },
                ]}
                onChange={(e) => update(row.uid, { value: e.target.value })}
              />
            ) : (
              <Input
                size="sm"
                label={`Value of specification ${i + 1}`}
                hideLabel
                inputMode={row.type === 'number' ? 'decimal' : undefined}
                placeholder={
                  row.type === 'list'
                    ? 'HDMI, USB-C, DisplayPort'
                    : row.type === 'number'
                      ? '240'
                      : 'Value'
                }
                value={row.value}
                onChange={(e) => update(row.uid, { value: e.target.value })}
                error={errors[`spec.${row.uid}.value`]}
                className="eh-numeric"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`Remove specification ${row.key || i + 1}`}
              onClick={() => onChange(rows.filter((r) => r.uid !== row.uid))}
              className="justify-self-end"
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      {errors.specs && <p className="text-xs text-danger">{errors.specs}</p>}
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Plus />}
        onClick={add}
        className="self-start"
      >
        Add specification
      </Button>
    </div>
  );
}
