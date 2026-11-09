import { ORDER_SET_STATUS, runScript } from '../db/scripts.js';
import { HttpError } from '../lib/httpError.js';
import {
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  orderInputSchema,
  type Order,
  type OrderInput,
  type OrderContact,
  type OrderItem,
  type OrderStatus,
} from '../schemas/order.js';
import { formatSequenceId, isEmptyHash, type RepositoryContext } from './context.js';

export interface OrderPage {
  items: Order[];
  total: number;
}

function toHashPairs(order: Order): string[] {
  return [
    'id', order.id,
    'customerId', order.customerId,
    'status', order.status,
    'items', JSON.stringify(order.items),
    'itemCount', String(order.itemCount),
    'subtotalCents', String(order.subtotalCents),
    'shippingCents', String(order.shippingCents),
    'totalCents', String(order.totalCents),
    'shippingAddress', JSON.stringify(order.shippingAddress),
    'contact', order.contact ? JSON.stringify(order.contact) : '',
    'createdAt', order.createdAt,
    'updatedAt', order.updatedAt,
  ]; // prettier-ignore
}

function fromHash(hash: Record<string, string>): Order {
  return {
    id: hash.id!,
    customerId: hash.customerId!,
    status: hash.status as OrderStatus,
    items: JSON.parse(hash.items!) as OrderItem[],
    itemCount: Number(hash.itemCount),
    subtotalCents: Number(hash.subtotalCents),
    shippingCents: Number(hash.shippingCents),
    totalCents: Number(hash.totalCents),
    shippingAddress: JSON.parse(hash.shippingAddress!) as Order['shippingAddress'],
    contact: hash.contact ? (JSON.parse(hash.contact) as OrderContact) : null,
    createdAt: hash.createdAt!,
    updatedAt: hash.updatedAt!,
  };
}

/**
 * Orders: `order:{id}` hashes indexed by time (`orders`), by customer
 * (`orders:customer:{id}`) and by status (`orders:status:{status}`).
 *
 * Stock is NOT taken here. The checkout flow is:
 *   inventory.reserve(lines) → orders.create(...) → (on failure) inventory.release(lines)
 */
export class OrderRepository {
  constructor(private readonly ctx: RepositoryContext) {}

  private get client() {
    return this.ctx.client;
  }

  private get keys() {
    return this.ctx.keys;
  }

  /**
   * Writes the order and all its indexes in one MULTI transaction, bumps the
   * best-seller ranking and (optionally) empties the customer's cart.
   */
  async create(input: OrderInput, options: { clearCart?: boolean } = {}): Promise<Order> {
    const data = orderInputSchema.parse(input);
    const id = formatSequenceId('ord', await this.client.incr(this.keys.counterOrder()));
    const now = new Date();
    const subtotalCents = data.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
    const order: Order = {
      id,
      customerId: data.customerId,
      status: 'pending',
      items: data.items,
      itemCount: data.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalCents,
      shippingCents: data.shippingCents,
      totalCents: subtotalCents + data.shippingCents,
      shippingAddress: data.shippingAddress,
      contact: data.contact ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const tx = this.client
      .multi()
      .hSet(this.keys.order(id), toHashPairs(order))
      .zAdd(this.keys.orders(), { score: now.getTime(), value: id })
      .zAdd(this.keys.ordersByCustomer(order.customerId), { score: now.getTime(), value: id })
      .sAdd(this.keys.ordersByStatus(order.status), id)
      .incrBy(this.keys.statsRevenue(), order.totalCents);
    for (const item of order.items) {
      tx.zIncrBy(this.keys.productsBySales(), item.quantity, item.productId);
    }
    if (options.clearCart) tx.del(this.keys.cart(order.customerId));
    await tx.exec();

    return order;
  }

  async findById(id: string): Promise<Order | null> {
    const hash = await this.client.hGetAll(this.keys.order(id));
    return isEmptyHash(hash) ? null : fromHash(hash);
  }

  private async load(ids: readonly string[]): Promise<Order[]> {
    const hashes = await Promise.all(ids.map((id) => this.client.hGetAll(this.keys.order(id))));
    return hashes.filter((h) => !isEmptyHash(h)).map(fromHash);
  }

  /** A customer's order history, newest first. */
  async listByCustomer(customerId: string, offset = 0, limit = 20): Promise<OrderPage> {
    const key = this.keys.ordersByCustomer(customerId);
    const [total, ids] = await Promise.all([
      this.client.zCard(key),
      this.client.zRange(key, offset, offset + limit - 1, { REV: true }),
    ]);
    return { items: await this.load(ids), total };
  }

  /** All orders, newest first. */
  async listRecent(offset = 0, limit = 20): Promise<OrderPage> {
    const [total, ids] = await Promise.all([
      this.client.zCard(this.keys.orders()),
      this.client.zRange(this.keys.orders(), offset, offset + limit - 1, { REV: true }),
    ]);
    return { items: await this.load(ids), total };
  }

  /** Orders currently in a status, newest first. */
  async listByStatus(status: OrderStatus, offset = 0, limit = 20): Promise<OrderPage> {
    const ids = await this.client.sMembers(this.keys.ordersByStatus(status));
    if (ids.length === 0) return { items: [], total: 0 };
    // Sort by placement time using the `orders` time index, then load only one page.
    const placedAt = await this.client.zmScore(this.keys.orders(), ids);
    const page = ids
      .map((id, i) => ({ id, at: placedAt[i] ?? 0 }))
      .sort((a, b) => b.at - a.at || b.id.localeCompare(a.id))
      .slice(offset, offset + limit)
      .map((entry) => entry.id);
    return { items: await this.load(page), total: ids.length };
  }

  async count(): Promise<number> {
    return this.client.zCard(this.keys.orders());
  }

  /** Revenue of all non-cancelled orders, in cents. */
  async revenueCents(): Promise<number> {
    return Number((await this.client.get(this.keys.statsRevenue())) ?? 0);
  }

  /**
   * Moves an order to a new status if the transition is allowed
   * (see ORDER_TRANSITIONS). The status check and the index move are one atomic step.
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const allowedFrom = ORDER_STATUSES.filter((from) => ORDER_TRANSITIONS[from].includes(status));
    const [result, previous] = (await runScript(this.client, ORDER_SET_STATUS, [
      this.keys.prefix,
      id,
      status,
      new Date().toISOString(),
      ...allowedFrom,
    ])) as [number, string];

    if (result === -1) throw HttpError.notFound(`Order "${id}" not found`);
    if (result === 0) {
      throw HttpError.conflict(
        `Cannot change order "${id}" from "${previous}" to "${status}"`,
        { from: previous, to: status, allowed: ORDER_TRANSITIONS[previous as OrderStatus] ?? [] },
        'INVALID_STATUS_TRANSITION',
      );
    }
    return (await this.findById(id))!;
  }

  async countByStatus(): Promise<Record<OrderStatus, number>> {
    const counts = await Promise.all(
      ORDER_STATUSES.map((s) => this.client.sCard(this.keys.ordersByStatus(s))),
    );
    return Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, counts[i]!])) as Record<
      OrderStatus,
      number
    >;
  }
}
