import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';
import type { Repositories } from '../repositories/index.js';
import type { CheckoutBody, PaginationQuery } from '../schemas/api.js';
import {
  CUSTOMER_CANCELLABLE,
  type Order,
  type OrderItem,
  type OrderStatus,
} from '../schemas/order.js';
import type { Paginated } from './catalogService.js';
import { shippingFor, type ShippingRules } from './pricing.js';

const toLines = (items: readonly OrderItem[]) =>
  items.map(({ productId, quantity }) => ({ productId, quantity }));

/**
 * Checkout and order lifecycle.
 *
 * Checkout = reserve stock (atomic, all-or-nothing Lua script)
 *          → write the order + clear the cart (MULTI)
 *          → if writing fails, give the stock back.
 * Cancelling = move to `cancelled` (atomic transition check) → give the stock back.
 */
export class OrderService {
  constructor(
    private readonly repos: Repositories,
    private readonly shipping: ShippingRules,
  ) {}

  async checkout(customerId: string, input: CheckoutBody): Promise<Order> {
    const lines = await this.repos.carts.getItems(customerId);
    if (lines.length === 0)
      throw HttpError.badRequest('Your cart is empty', undefined, 'EMPTY_CART');

    const products = await this.repos.products.findByIds(lines.map((l) => l.productId));
    const byId = new Map(products.map((p) => [p.id, p]));
    const missing = lines.filter((l) => !byId.has(l.productId)).map((l) => l.productId);
    if (missing.length > 0) {
      throw HttpError.conflict(
        'Some products in your cart are no longer available',
        { productIds: missing },
        'PRODUCT_UNAVAILABLE',
      );
    }

    const reservation = await this.repos.inventory.reserve(lines);
    if (!reservation.ok) {
      throw HttpError.conflict(
        `Not enough stock for "${reservation.productId}"`,
        {
          productId: reservation.productId,
          requested: reservation.requested,
          available: reservation.available ?? 0,
        },
        'INSUFFICIENT_STOCK',
      );
    }

    // Prices are taken from the catalogue at the moment of purchase and snapshotted.
    const items: OrderItem[] = lines.map((line) => {
      const product = byId.get(line.productId)!;
      return {
        productId: product.id,
        name: product.name,
        unitPriceCents: product.priceCents,
        quantity: line.quantity,
      };
    });
    const subtotal = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

    let order: Order;
    try {
      order = await this.repos.orders.create(
        {
          customerId,
          items,
          shippingAddress: input.shippingAddress,
          shippingCents: shippingFor(subtotal, this.shipping),
          contact: { email: input.email, name: input.name, phone: input.phone },
        },
        { clearCart: true },
      );
    } catch (error) {
      await this.repos.inventory.release(lines);
      throw error;
    }

    // The order is placed; a profile-save failure must not undo it.
    try {
      await this.repos.customers.saveGuestProfile(customerId, {
        email: input.email,
        name: input.name,
        phone: input.phone,
        address: input.shippingAddress,
      });
    } catch (error) {
      logger.warn(`[checkout] could not save profile for ${customerId}:`, error);
    }
    return order;
  }

  async listForCustomer(
    customerId: string,
    { page, limit }: PaginationQuery,
  ): Promise<Paginated<Order>> {
    const { items, total } = await this.repos.orders.listByCustomer(
      customerId,
      (page - 1) * limit,
      limit,
    );
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  /** Customers can only see their own orders; anyone else's id is reported as not found. */
  async getForCustomer(customerId: string, orderId: string): Promise<Order> {
    const order = await this.repos.orders.findById(orderId);
    if (!order || order.customerId !== customerId) {
      throw HttpError.notFound(`Order "${orderId}" not found`, 'ORDER_NOT_FOUND');
    }
    return order;
  }

  async cancelForCustomer(customerId: string, orderId: string): Promise<Order> {
    const order = await this.getForCustomer(customerId, orderId);
    if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
      throw HttpError.conflict(
        `Order "${orderId}" can no longer be cancelled (status: ${order.status})`,
        { status: order.status },
        'ORDER_NOT_CANCELLABLE',
      );
    }
    return this.transition(orderId, 'cancelled');
  }

  async getForAdmin(orderId: string): Promise<Order> {
    const order = await this.repos.orders.findById(orderId);
    if (!order) throw HttpError.notFound(`Order "${orderId}" not found`, 'ORDER_NOT_FOUND');
    return order;
  }

  async listForAdmin(query: PaginationQuery & { status?: OrderStatus }): Promise<Paginated<Order>> {
    const offset = (query.page - 1) * query.limit;
    const { items, total } = query.status
      ? await this.repos.orders.listByStatus(query.status, offset, query.limit)
      : await this.repos.orders.listRecent(offset, query.limit);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async updateStatusForAdmin(orderId: string, status: OrderStatus): Promise<Order> {
    return this.transition(orderId, status);
  }

  /**
   * The status script re-checks the transition atomically, so two concurrent
   * cancellations can't both succeed. Only the one that did returns stock.
   */
  private async transition(orderId: string, status: OrderStatus): Promise<Order> {
    const updated = await this.repos.orders.updateStatus(orderId, status);
    if (status === 'cancelled') {
      await this.repos.inventory.release(toLines(updated.items));
    }
    return updated;
  }
}
