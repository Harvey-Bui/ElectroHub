import type { RequestHandler } from 'express';
import { ADMIN_COOKIE } from '../lib/cookies.js';
import { HttpError } from '../lib/httpError.js';
import type { AuthService } from '../services/authService.js';

/** Reads the raw admin session token from the signed cookie (undefined if absent or tampered). */
export function adminToken(signedCookies: Record<string, unknown> | undefined): string | undefined {
  const value = signedCookies?.[ADMIN_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Rejects the request with 401 unless it carries a valid admin session.
 * Admin responses are marked `no-store` so they are never cached.
 */
export function requireAdmin(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const session = await auth.authenticate(adminToken(req.signedCookies));
    if (!session) throw HttpError.unauthorized('Administrator login required');
    req.admin = session;
    next();
  };
}
