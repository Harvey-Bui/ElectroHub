import type { AppConfig } from '../config.js';

export type ShippingRules = Pick<
  AppConfig['store'],
  'freeShippingThresholdCents' | 'shippingFlatCents'
>;

/** Flat-rate shipping, free at or above the threshold. Empty carts ship for nothing. */
export function shippingFor(subtotalCents: number, rules: ShippingRules): number {
  if (subtotalCents === 0 || subtotalCents >= rules.freeShippingThresholdCents) return 0;
  return rules.shippingFlatCents;
}
