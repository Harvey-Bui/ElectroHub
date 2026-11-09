import { HttpError } from '../lib/httpError.js';
import type { Repositories } from '../repositories/index.js';
import type { Category } from '../schemas/product.js';
import { shippingFor, type ShippingRules } from './pricing.js';

export interface CartLine {
  productId: string;
  name: string;
  brand: string;
  category: Category;
  imageUrl: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  /** Units currently in stock. */
  stock: number;
  /** True when the cart asks for more than is in stock (stock fell after the item was added). */
  exceedsStock: boolean;
}

export interface Cart {
  items: CartLine[];
  itemCount: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  /** True if any line can't be fulfilled as-is; checkout would fail. */
  hasStockIssues: boolean;
  /** Lines dropped because the product no longer exists. */
  removedProductIds: string[];
}

/**
 * The shopping cart. Every change is checked against live product data and
 * stock. Stock is only *taken* at checkout (atomically), so the cart checks
 * are there to give the shopper early, accurate feedback.
 */
export class CartService {
  constructor(
    private readonly repos: Repositories,
    private readonly shipping: ShippingRules,
  ) {}

  async getCart(customerId: string): Promise<Cart> {
    const lines = await this.repos.carts.getItems(customerId);
    const products = await this.repos.products.findByIds(lines.map((l) => l.productId));
    const byId = new Map(products.map((p) => [p.id, p]));

    const removedProductIds: string[] = [];
    const items: CartLine[] = [];
    for (const line of lines) {
      const product = byId.get(line.productId);
      if (!product) {
        removedProductIds.push(line.productId);
        continue;
      }
      items.push({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        imageUrl: product.imageUrl,
        unitPriceCents: product.priceCents,
        quantity: line.quantity,
        lineTotalCents: product.priceCents * line.quantity,
        stock: product.stock,
        exceedsStock: line.quantity > product.stock,
      });
    }
    // Clean up lines for products that were deleted from the catalogue.
    await Promise.all(removedProductIds.map((id) => this.repos.carts.removeItem(customerId, id)));

    const subtotalCents = items.reduce((sum, i) => sum + i.lineTotalCents, 0);
    const shippingCents = shippingFor(subtotalCents, this.shipping);
    return {
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalCents,
      shippingCents,
      totalCents: subtotalCents + shippingCents,
      hasStockIssues: items.some((i) => i.exceedsStock),
      removedProductIds,
    };
  }

  private async requireProduct(productId: string) {
    const product = await this.repos.products.findById(productId);
    if (!product) throw HttpError.notFound(`Product "${productId}" not found`, 'PRODUCT_NOT_FOUND');
    return product;
  }

  private assertStock(productId: string, wanted: number, stock: number, inCart: number) {
    if (stock === 0) {
      throw HttpError.conflict(`"${productId}" is out of stock`, { available: 0 }, 'OUT_OF_STOCK');
    }
    if (wanted > stock) {
      throw HttpError.conflict(
        `Only ${stock} unit(s) of "${productId}" in stock`,
        { requested: wanted, available: stock, inCart },
        'INSUFFICIENT_STOCK',
      );
    }
  }

  private async quantityInCart(customerId: string, productId: string): Promise<number> {
    const lines = await this.repos.carts.getItems(customerId);
    return lines.find((l) => l.productId === productId)?.quantity ?? 0;
  }

  /** Adds units to the cart (merging with an existing line). */
  async addItem(customerId: string, productId: string, quantity: number): Promise<Cart> {
    const product = await this.requireProduct(productId);
    const inCart = await this.quantityInCart(customerId, productId);
    this.assertStock(productId, inCart + quantity, product.stock, inCart);
    await this.repos.carts.addItem(customerId, productId, quantity);
    return this.getCart(customerId);
  }

  /** Sets the quantity of a line already in the cart; 0 removes it. */
  async updateItem(customerId: string, productId: string, quantity: number): Promise<Cart> {
    const inCart = await this.quantityInCart(customerId, productId);
    if (inCart === 0) {
      throw HttpError.notFound(`"${productId}" is not in the cart`, 'CART_ITEM_NOT_FOUND');
    }
    if (quantity === 0) return this.removeItem(customerId, productId);

    const product = await this.repos.products.findById(productId);
    if (!product) {
      await this.repos.carts.removeItem(customerId, productId);
      throw HttpError.notFound(`Product "${productId}" no longer exists`, 'PRODUCT_NOT_FOUND');
    }
    this.assertStock(productId, quantity, product.stock, inCart);
    await this.repos.carts.setQuantity(customerId, productId, quantity);
    return this.getCart(customerId);
  }

  async removeItem(customerId: string, productId: string): Promise<Cart> {
    if (!(await this.repos.carts.removeItem(customerId, productId))) {
      throw HttpError.notFound(`"${productId}" is not in the cart`, 'CART_ITEM_NOT_FOUND');
    }
    return this.getCart(customerId);
  }

  async clear(customerId: string): Promise<void> {
    await this.repos.carts.clear(customerId);
  }
}
