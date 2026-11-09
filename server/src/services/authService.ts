import type { AppConfig } from '../config.js';
import { generateToken, hashPassword, hashToken, verifyPassword } from '../lib/crypto.js';
import { HttpError } from '../lib/httpError.js';
import type { AdminSession } from '../repositories/adminRepository.js';
import type { Repositories } from '../repositories/index.js';

export const MIN_ADMIN_PASSWORD_LENGTH = 12;
const LOGIN_SCOPE = 'admin-login';

export interface LoginResult {
  /** Raw session token for the cookie. Only its SHA-256 is stored in Redis. */
  token: string;
  session: AdminSession;
}

/**
 * Administrator authentication: scrypt password check, Redis-backed sessions
 * with a TTL, and a failed-attempt limit per client IP.
 */
export class AuthService {
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly repos: Repositories,
    private readonly security: AppConfig['security'],
  ) {}

  async login(username: string, password: string, clientIp: string): Promise<LoginResult> {
    const limit = await this.repos.rateLimits.peek(LOGIN_SCOPE, clientIp);
    if (limit.count >= this.security.loginMaxAttempts) {
      throw HttpError.tooManyRequests(
        'Too many failed login attempts. Try again later.',
        limit.resetInSeconds || this.security.loginWindowSeconds,
      );
    }

    const account = await this.repos.admins.findByUsername(username);
    // Always run scrypt, even for unknown users, so timing doesn't reveal which usernames exist.
    this.dummyHash ??= hashPassword(generateToken());
    const valid = await verifyPassword(password, account?.passwordHash ?? (await this.dummyHash));

    if (!account || !valid) {
      await this.repos.rateLimits.hit(LOGIN_SCOPE, clientIp, this.security.loginWindowSeconds);
      throw HttpError.unauthorized('Invalid username or password', 'INVALID_CREDENTIALS');
    }

    await this.repos.rateLimits.reset(LOGIN_SCOPE, clientIp);
    const token = generateToken();
    const session = await this.repos.admins.createSession(
      hashToken(token),
      account.username,
      this.security.adminSessionTtlSeconds,
    );
    return { token, session };
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) await this.repos.admins.deleteSession(hashToken(token));
  }

  async authenticate(token: string | undefined): Promise<AdminSession | null> {
    if (!token) return null;
    return this.repos.admins.findSession(hashToken(token));
  }

  /** Creates an admin or rotates its password. Used by the `admin:create` script and tests. */
  async createAdmin(username: string, password: string): Promise<{ created: boolean }> {
    if (!/^[a-z0-9_.-]{3,64}$/i.test(username)) {
      throw HttpError.badRequest('Username must be 3-64 letters, digits, ".", "_" or "-"');
    }
    if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
      throw HttpError.badRequest(
        `Password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`,
      );
    }
    const created = await this.repos.admins.upsert(username, await hashPassword(password));
    return { created };
  }
}
