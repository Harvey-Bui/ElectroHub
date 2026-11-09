import type { CookieOptions } from 'express';
import type { AppConfig } from '../config.js';

export const CUSTOMER_COOKIE = 'eh_customer';
export const ADMIN_COOKIE = 'eh_admin';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Anonymous shopper id. HTTP-only (JavaScript can't read it), signed (can't be
 * forged or edited), SameSite=Lax (not sent on cross-site POSTs).
 */
export function customerCookieOptions(security: AppConfig['security']): CookieOptions {
  return {
    httpOnly: true,
    signed: true,
    sameSite: 'lax',
    secure: security.secureCookies,
    path: '/api',
    maxAge: ONE_YEAR_MS,
  };
}

/** Admin session. SameSite=Strict and scoped to the admin API. */
export function adminCookieOptions(security: AppConfig['security']): CookieOptions {
  return {
    httpOnly: true,
    signed: true,
    sameSite: 'strict',
    secure: security.secureCookies,
    path: '/api/admin',
    maxAge: security.adminSessionTtlSeconds * 1000,
  };
}

/** Options for clearing a cookie must match the path/flags it was set with (minus maxAge). */
export function clearOptions(options: CookieOptions): CookieOptions {
  const { maxAge: _maxAge, ...rest } = options;
  return rest;
}
