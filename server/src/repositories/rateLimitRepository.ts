import type { RepositoryContext } from './context.js';

/**
 * Fixed-window counters (`ratelimit:{scope}:{subject}` strings with a TTL).
 * Used to slow down password guessing on the admin login.
 */
export class RateLimitRepository {
  constructor(private readonly ctx: RepositoryContext) {}

  /** Current count and seconds until the window resets (0 if no window is open). */
  async peek(scope: string, subject: string): Promise<{ count: number; resetInSeconds: number }> {
    const key = this.ctx.keys.rateLimit(scope, subject);
    const [count, ttl] = await Promise.all([this.ctx.client.get(key), this.ctx.client.ttl(key)]);
    return { count: Number(count ?? 0), resetInSeconds: Math.max(ttl, 0) };
  }

  /** Increments the counter; the first hit opens a window of `windowSeconds`. */
  async hit(scope: string, subject: string, windowSeconds: number): Promise<number> {
    const key = this.ctx.keys.rateLimit(scope, subject);
    const [count] = await this.ctx.client.multi().incr(key).expire(key, windowSeconds, 'NX').exec();
    return Number(count);
  }

  async reset(scope: string, subject: string): Promise<void> {
    await this.ctx.client.del(this.ctx.keys.rateLimit(scope, subject));
  }
}
