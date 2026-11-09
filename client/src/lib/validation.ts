import { flushSync } from 'react-dom';
import type { CheckoutInput } from '@/api/types';

/** Field errors keyed by the same dotted paths the API reports (e.g. "shippingAddress.city"). */
export type FieldErrors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Client-side checkout validation. Mirrors the server's Zod schema so shoppers
 * get instant feedback; the server still validates and its errors are shown
 * the same way.
 */
export function validateCheckout(input: CheckoutInput): FieldErrors {
  const errors: FieldErrors = {};
  const a = input.shippingAddress;
  if (!input.email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL.test(input.email.trim()))
    errors.email = 'Enter a valid email address, like name@example.com.';
  if (!input.name.trim()) errors.name = 'Enter your full name.';
  else if (input.name.trim().length > 120) errors.name = 'Name must be 120 characters or fewer.';
  if (input.phone && input.phone.length > 30) errors.phone = 'Phone number is too long.';
  if (!a.line1.trim()) errors['shippingAddress.line1'] = 'Enter a street address.';
  if (!a.city.trim()) errors['shippingAddress.city'] = 'Enter a city.';
  if (!a.postalCode.trim()) errors['shippingAddress.postalCode'] = 'Enter a postal code.';
  else if (a.postalCode.trim().length > 20)
    errors['shippingAddress.postalCode'] = 'Postal code is too long.';
  if (!/^[A-Z]{2}$/.test(a.country)) errors['shippingAddress.country'] = 'Choose a country.';
  return errors;
}

/** Drops empty optional strings so the API receives `undefined`, not "". */
export function cleanCheckout(input: CheckoutInput): CheckoutInput {
  const a = input.shippingAddress;
  const opt = (v?: string) => (v && v.trim() ? v.trim() : undefined);
  return {
    email: input.email.trim(),
    name: input.name.trim(),
    phone: opt(input.phone),
    shippingAddress: {
      line1: a.line1.trim(),
      line2: opt(a.line2),
      city: a.city.trim(),
      region: opt(a.region),
      postalCode: a.postalCode.trim(),
      country: a.country,
    },
  };
}

/**
 * Shows field errors and moves focus to the first invalid control.
 * `flushSync` renders the errors before focusing, so this does not depend on
 * requestAnimationFrame (which browsers pause in background tabs).
 */
export function showErrorsAndFocus(
  setErrors: (errors: FieldErrors) => void,
  errors: FieldErrors,
  root: HTMLElement | null,
) {
  flushSync(() => setErrors(errors));
  root?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
