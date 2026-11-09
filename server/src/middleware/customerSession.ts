import type { RequestHandler } from 'express';
import type { AppConfig } from '../config.js';
import { CUSTOMER_COOKIE, customerCookieOptions } from '../lib/cookies.js';
import { CUSTOMER_ID_PATTERN, generateCustomerId } from '../lib/crypto.js';

/**
 * Identifies the shopper without a login (v1). Reads the signed `eh_customer`
 * cookie; if it is missing, unsigned, tampered with or malformed, a new random
 * customer id is issued. Sets `req.customerId`.
 */
export function customerSession(security: AppConfig['security']): RequestHandler {
  const options = customerCookieOptions(security);
  return (req, res, next) => {
    const raw: unknown = req.signedCookies?.[CUSTOMER_COOKIE];
    let customerId = typeof raw === 'string' && CUSTOMER_ID_PATTERN.test(raw) ? raw : undefined;
    if (!customerId) {
      customerId = generateCustomerId();
      res.cookie(CUSTOMER_COOKIE, customerId, options);
    }
    req.customerId = customerId;
    next();
  };
}

/** Narrowing helper for controllers mounted behind `customerSession`. */
export function requireCustomerId(customerId: string | undefined): string {
  if (!customerId) throw new Error('customerSession middleware is not mounted');
  return customerId;
}
