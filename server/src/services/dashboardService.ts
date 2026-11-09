import type { Repositories } from '../repositories/index.js';
import type { InventorySummary } from '../repositories/inventoryRepository.js';
import type { Order, OrderStatus } from '../schemas/order.js';
import type { Category } from '../schemas/product.js';
import type { CatalogService, LowStockEntry } from './catalogService.js';

export interface Dashboard {
  generatedAt: string;
  catalog: { products: number; byCategory: Record<Category, number> };
  customers: number;
  orders: {
    total: number;
    byStatus: Record<OrderStatus, number>;
    /** Sum of all orders that were not cancelled. */
    revenueCents: number;
    averageOrderCents: number;
  };
  inventory: InventorySummary;
  lowStock: LowStockEntry[];
  topSellers: Array<{ productId: string; name: string; unitsSold: number }>;
  recentOrders: Array<
    Pick<Order, 'id' | 'customerId' | 'status' | 'totalCents' | 'itemCount' | 'createdAt'>
  >;
}

/** Admin overview built entirely from Redis counters and indexes (no scans). */
export class DashboardService {
  constructor(
    private readonly repos: Repositories,
    private readonly catalog: CatalogService,
  ) {}

  async overview(): Promise<Dashboard> {
    const [
      products,
      byCategory,
      customers,
      total,
      byStatus,
      revenueCents,
      inventory,
      lowStock,
      top,
      recent,
    ] = await Promise.all([
      this.repos.products.count(),
      this.repos.products.countByCategory(),
      this.repos.customers.count(),
      this.repos.orders.count(),
      this.repos.orders.countByStatus(),
      this.repos.orders.revenueCents(),
      this.repos.inventory.summary(),
      this.catalog.lowStock(5),
      this.repos.products.topSelling(5),
      this.repos.orders.listRecent(0, 5),
    ]);

    const nonCancelled = total - byStatus.cancelled;
    return {
      generatedAt: new Date().toISOString(),
      catalog: { products, byCategory },
      customers,
      orders: {
        total,
        byStatus,
        revenueCents,
        averageOrderCents: nonCancelled > 0 ? Math.round(revenueCents / nonCancelled) : 0,
      },
      inventory,
      lowStock,
      topSellers: top
        .filter((t) => t.unitsSold > 0)
        .map((t) => ({ productId: t.product.id, name: t.product.name, unitsSold: t.unitsSold })),
      recentOrders: recent.items.map(
        ({ id, customerId, status, totalCents, itemCount, createdAt }) => ({
          id,
          customerId,
          status,
          totalCents,
          itemCount,
          createdAt,
        }),
      ),
    };
  }
}
