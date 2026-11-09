import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 64 } as const;

function scryptAsync(password: string, salt: Buffer, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/**
 * Hashes a password with scrypt and a random 16-byte salt.
 * Format: `scrypt$N$r$p$saltBase64$hashBase64` (parameters stored so they can be raised later).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const { N, r, p, keyLength } = SCRYPT;
  const hash = await scryptAsync(password, salt, keyLength, { N, r, p });
  return ['scrypt', N, r, p, salt.toString('base64'), hash.toString('base64')].join('$');
}

/** Constant-time comparison against a stored hash. Malformed hashes never match. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** 256-bit random session token, URL-safe. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Session tokens are stored hashed so a Redis dump can't be replayed as a login. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Unguessable guest customer id: `cus_` + 24 hex chars (96 bits). */
export function generateCustomerId(): string {
  return `cus_${randomBytes(12).toString('hex')}`;
}

export const CUSTOMER_ID_PATTERN = /^cus_[a-f0-9]{24}$/;
