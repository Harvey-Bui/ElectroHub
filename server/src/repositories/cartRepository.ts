import { HttpError } from '../lib/httpError.js';
import type { RepositoryContext } from './context.js';
import type { StockLine } from './inventoryRepository.js';

function assertQuantity(quantity: number, allowZero: boolean): void {
  const min = allowZero ? 0 : 1;
  if (!Number.isInteger(quantity) || quantity < min || quantity > 999) {
    throw HttpError.badRequest(`Quantity must be an integer between ${min} and 999`);
  }
}

/**
 * Shopping carts: one `cart:{customerId}` hash per customer mapping
 * productId → quantity. Every write refreshes a sliding TTL so abandoned carts
 * clean themselves up. Stock and price checks belong to the cart service; this
 * module only stores what was chosen.
 */
export class CartRepository {
  constructor(private readonly ctx: RepositoryContext) {}

  private get client() {
    return this.ctx.client;
  }

  private key(customerId: string) {
    return this.ctx.keys.cart(customerId);
  }

  async getItems(customerId: string): Promise<StockLine[]> {
    const hash = await this.client.hGetAll(this.key(customerId));
    return Object.entries(hash)
      .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }))
      .sort((a, b) => a.productId.localeCompare(b.productId));
  }

  /** Adds to the existing quantity; returns the new quantity. */
  async addItem(customerId: string, productId: string, quantity = 1): Promise<number> {
    assertQuantity(quantity, false);
    const key = this.key(customerId);
    const [newQuantity] = await this.client
      .multi()
      .hIncrBy(key, productId, quantity)
      .expire(key, this.ctx.cartTtlSeconds)
      .exec();
    return Number(newQuantity);
  }

  /** Sets an exact quantity; 0 removes the line. */
  async setQuantity(customerId: string, productId: string, quantity: number): Promise<void> {
    assertQuantity(quantity, true);
    if (quantity === 0) {
      await this.removeItem(customerId, productId);
      return;
    }
    const key = this.key(customerId);
    await this.client
      .multi()
      .hSet(key, productId, quantity)
      .expire(key, this.ctx.cartTtlSeconds)
      .exec();
  }

  async removeItem(customerId: string, productId: string): Promise<boolean> {
    return (await this.client.hDel(this.key(customerId), productId)) === 1;
  }

  async clear(customerId: string): Promise<void> {
    await this.client.del(this.key(customerId));
  }

  /** Number of distinct products in the cart. */
  async lineCount(customerId: string): Promise<number> {
    return this.client.hLen(this.key(customerId));
  }

  /** Seconds until the cart expires, or null if it does not exist. */
  async ttl(customerId: string): Promise<number | null> {
    const seconds = await this.client.ttl(this.key(customerId));
    return seconds < 0 ? null : seconds;
  }
}
