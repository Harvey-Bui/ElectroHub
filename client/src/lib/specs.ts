import type { SpecValue } from '@/api/types';

/** Spec keys with a known label and unit. Unknown keys fall back to "Camel Case". */
const KNOWN: Record<string, { label: string; unit?: string }> = {
  cpu: { label: 'Processor' },
  gpu: { label: 'Graphics' },
  ramGb: { label: 'Memory', unit: 'GB' },
  storage: { label: 'Storage' },
  display: { label: 'Display' },
  os: { label: 'Operating system' },
  weightKg: { label: 'Weight', unit: 'kg' },
  weightGrams: { label: 'Weight', unit: 'g' },
  batteryHours: { label: 'Battery', unit: 'h' },
  psuWatts: { label: 'Power supply', unit: 'W' },
  formFactor: { label: 'Form factor' },
  sensor: { label: 'Sensor' },
  maxDpi: { label: 'Max DPI' },
  sizeInches: { label: 'Screen size', unit: '″' },
  resolution: { label: 'Resolution' },
  panel: { label: 'Panel' },
  refreshHz: { label: 'Refresh rate', unit: 'Hz' },
  responseMs: { label: 'Response time', unit: 'ms' },
  usbCPowerWatts: { label: 'USB-C power', unit: 'W' },
  hdr: { label: 'HDR' },
  curvature: { label: 'Curvature' },
  noiseCancelling: { label: 'Noise cancelling' },
  impedanceOhms: { label: 'Impedance', unit: 'Ω' },
  frequencyResponse: { label: 'Frequency response' },
  polarPattern: { label: 'Polar pattern' },
  sampleRateKhz: { label: 'Sample rate', unit: 'kHz' },
  bitDepth: { label: 'Bit depth', unit: '-bit' },
  requiresInterface: { label: 'Needs audio interface' },
};

export function specLabel(key: string): string {
  return (
    KNOWN[key]?.label ??
    key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
  );
}

export function specValue(key: string, value: SpecValue): string {
  if (value === null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  const unit = KNOWN[key]?.unit;
  if (!unit) return String(value);
  return unit === '″' || unit === '-bit' ? `${value}${unit}` : `${value} ${unit}`;
}

/** Keys worth surfacing on a product card, in priority order. */
const HIGHLIGHT_KEYS = [
  'gpu', 'cpu', 'ramGb', 'refreshHz', 'resolution', 'panel', 'sizeInches',
  'sensor', 'maxDpi', 'weightGrams', 'noiseCancelling', 'batteryHours', 'type',
  'polarPattern', 'connection', 'formFactor',
]; // prettier-ignore

const shorten = (text: string) =>
  text
    .replace(/^NVIDIA GeForce /, '')
    .replace(/^Intel Core /, 'Core ')
    .replace(/^Apple /, '');

/** Up to `count` short spec chips, e.g. ["RTX 5070 Ti 12GB", "32 GB"]. */
export function specHighlights(specs: Record<string, SpecValue>, count = 2): string[] {
  const out: string[] = [];
  for (const key of HIGHLIGHT_KEYS) {
    if (!(key in specs) || out.length >= count) continue;
    const value = specs[key]!;
    if (typeof value === 'boolean') {
      if (value && key === 'noiseCancelling') out.push('ANC');
      continue;
    }
    const text = shorten(specValue(key, value));
    if (text.length <= 22) out.push(text);
  }
  return out;
}
