import { isEmptyHash, type RepositoryContext } from './context.js';

export interface AdminAccount {
  username: string;
  /** scrypt$N$r$p$salt$hash. Never leaves the server. */
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSession {
  username: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Administrator accounts (`admin:{username}` hashes) and their login sessions
 * (`session:admin:{sha256(token)}` hashes that expire with a Redis TTL).
 */
export class AdminRepository {
  constructor(private readonly ctx: RepositoryContext) {}

  private get client() {
    return this.ctx.client;
  }

  private get keys() {
    return this.ctx.keys;
  }

  async findByUsername(username: string): Promise<AdminAccount | null> {
    const hash = await this.client.hGetAll(this.keys.admin(username));
    if (isEmptyHash(hash)) return null;
    return {
      username: hash.username!,
      passwordHash: hash.passwordHash!,
      createdAt: hash.createdAt!,
      updatedAt: hash.updatedAt!,
    };
  }

  /** Creates the account, or replaces the password of an existing one. Returns true if created. */
  async upsert(username: string, passwordHash: string): Promise<boolean> {
    const key = this.keys.admin(username);
    const now = new Date().toISOString();
    const [created] = await this.client
      .multi()
      .hSetNX(key, 'createdAt', now)
      .hSet(key, { username: username.toLowerCase(), passwordHash, updatedAt: now })
      .exec();
    return Number(created) === 1;
  }

  async createSession(
    tokenHash: string,
    username: string,
    ttlSeconds: number,
  ): Promise<AdminSession> {
    const now = Date.now();
    const session: AdminSession = {
      username,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
    };
    const key = this.keys.adminSession(tokenHash);
    await this.client
      .multi()
      .hSet(key, { ...session })
      .expire(key, ttlSeconds)
      .exec();
    return session;
  }

  async findSession(tokenHash: string): Promise<AdminSession | null> {
    const hash = await this.client.hGetAll(this.keys.adminSession(tokenHash));
    if (isEmptyHash(hash)) return null;
    return { username: hash.username!, createdAt: hash.createdAt!, expiresAt: hash.expiresAt! };
  }

  async deleteSession(tokenHash: string): Promise<boolean> {
    return (await this.client.del(this.keys.adminSession(tokenHash))) === 1;
  }
}
