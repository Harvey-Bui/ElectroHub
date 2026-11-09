import {
  INVENTORY_ADJUST,
  INVENTORY_RELEASE,
  INVENTORY_RESERVE,
  INVENTORY_SET,
  runScript,
} from '../db/scripts.js';
import { HttpError } from '../lib/httpError.js';
import type { RepositoryContext } from './context.js';

export interface StockLine {
  productId: string;
  quantity: number;
}

export type ReserveResult =
  { ok: true } | { ok: false; productId: string; requested: number; available: number | null };

export interface InventorySummary {
  trackedProducts: number;
  totalUnits: number;
  lowStock: number;
  outOfStock: number;
  lowStockThreshold: number;
}

/** Merges duplicate product ids so a reservation checks the combined quantity. */
function mergeLines(lines: readonly StockLine[]): StockLine[] {
  const totals = new Map<string, number>();
  for (const { productId, quantity } of lines) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw HttpError.badRequest(`Quantity for "${productId}" must be a positive integer`);
    }
    totals.set(productId, (totals.get(productId) ?? 0) + quantity);
  }
  return [...totals].map(([productId, quantity]) => ({ productId, quantity }));
}

/**
 * Stock levels. The `inventory` hash is the single source of truth; the
 * `inventory:low-stock` ranking and `inventory:out-of-stock` set are kept in
 * sync by the same Lua script that changes the number.
 */
export class InventoryRepository {
  constructor(private readonly ctx: RepositoryContext) {}

  private get client() {
    return this.ctx.client;
  }

  private get keys() {
    return this.ctx.keys;
  }

  /** Units in stock, or null if the product has no inventory record. */
  async getStock(productId: string): Promise<number | null> {
    const value = await this.client.hGet(this.keys.inventory(), productId);
    return value == null ? null : Number(value);
  }

  async getStocks(productIds: readonly string[]): Promise<Map<string, number | null>> {
    if (productIds.length === 0) return new Map();
    const values = await this.client.hmGet(this.keys.inventory(), [...productIds]);
    return new Map(productIds.map((id, i) => [id, values[i] == null ? null : Number(values[i])]));
  }

  /** Sets an absolute stock level (stock-take / admin correction). */
  async setStock(productId: string, stock: number): Promise<number> {
    if (!Number.isInteger(stock) || stock < 0) {
      throw HttpError.badRequest('Stock must be a non-negative integer');
    }
    const result = Number(
      await runScript(this.client, INVENTORY_SET, [
        this.keys.prefix,
        productId,
        stock,
        this.ctx.lowStockThreshold,
      ]),
    );
    if (result < 0) throw HttpError.notFound(`Product "${productId}" not found`);
    return result;
  }

  /** Adds (restock) or removes units. Never lets stock go below zero. */
  async adjust(productId: string, delta: number): Promise<number> {
    if (!Number.isInteger(delta)) throw HttpError.badRequest('Delta must be an integer');
    const [status, value] = (await runScript(this.client, INVENTORY_ADJUST, [
      this.keys.prefix,
      productId,
      delta,
      this.ctx.lowStockThreshold,
    ])) as [number, number];
    if (status === -1) throw HttpError.notFound(`Product "${productId}" not found`);
    if (status === 0) {
      throw HttpError.conflict(
        `Not enough stock for "${productId}"`,
        { available: value },
        'INSUFFICIENT_STOCK',
      );
    }
    return value;
  }

  /**
   * Atomically takes stock for every line, or for none of them. Two shoppers
   * racing for the last unit: exactly one gets `{ ok: true }`.
   */
  async reserve(lines: readonly StockLine[]): Promise<ReserveResult> {
    const merged = mergeLines(lines);
    if (merged.length === 0) return { ok: true };
    const reply = (await runScript(this.client, INVENTORY_RESERVE, [
      this.keys.prefix,
      this.ctx.lowStockThreshold,
      ...merged.flatMap((l) => [l.productId, l.quantity]),
    ])) as [number, string?, number?];

    if (reply[0] === 1) return { ok: true };
    const productId = String(reply[1]);
    return {
      ok: false,
      productId,
      requested: merged.find((l) => l.productId === productId)?.quantity ?? 0,
      available: reply[2] === -1 ? null : Number(reply[2]),
    };
  }

  /** Puts reserved stock back (failed checkout, cancelled order). */
  async release(lines: readonly StockLine[]): Promise<number> {
    const merged = mergeLines(lines);
    if (merged.length === 0) return 0;
    return Number(
      await runScript(this.client, INVENTORY_RELEASE, [
        this.keys.prefix,
        this.ctx.lowStockThreshold,
        ...merged.flatMap((l) => [l.productId, l.quantity]),
      ]),
    );
  }

  /** Lowest stock first (out-of-stock products have score 0 and come first). */
  async lowStock(limit = 20): Promise<StockLine[]> {
    const rows = await this.client.zRangeWithScores(this.keys.inventoryLowStock(), 0, limit - 1);
    return rows.map((row) => ({ productId: row.value, quantity: row.score }));
  }

  async outOfStock(): Promise<string[]> {
    return (await this.client.sMembers(this.keys.inventoryOutOfStock())).sort();
  }

  async summary(): Promise<InventorySummary> {
    const [values, lowStock, outOfStock] = await Promise.all([
      this.client.hVals(this.keys.inventory()),
      this.client.zCard(this.keys.inventoryLowStock()),
      this.client.sCard(this.keys.inventoryOutOfStock()),
    ]);
    return {
      trackedProducts: values.length,
      totalUnits: values.reduce((sum, v) => sum + Number(v), 0),
      lowStock,
      outOfStock,
      lowStockThreshold: this.ctx.lowStockThreshold,
    };
  }
}
