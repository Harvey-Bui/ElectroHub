import type { AppConfig } from '../config.js';
import { createKeys } from '../db/keys.js';
import type { RedisClient } from '../db/redis.js';
import { AdminRepository } from './adminRepository.js';
import { CartRepository } from './cartRepository.js';
import type { RepositoryContext } from './context.js';
import { CustomerRepository } from './customerRepository.js';
import { InventoryRepository } from './inventoryRepository.js';
import { OrderRepository } from './orderRepository.js';
import { ProductRepository } from './productRepository.js';
import { RateLimitRepository } from './rateLimitRepository.js';

export interface Repositories {
  products: ProductRepository;
  inventory: InventoryRepository;
  customers: CustomerRepository;
  carts: CartRepository;
  orders: OrderRepository;
  admins: AdminRepository;
  rateLimits: RateLimitRepository;
}

export interface RepositoryConfig {
  redis: Pick<AppConfig['redis'], 'keyPrefix'>;
  store: Pick<AppConfig['store'], 'lowStockThreshold' | 'cartTtlSeconds'>;
}

/** Builds every repository around one Redis client and key prefix. */
export function createRepositories(client: RedisClient, config: RepositoryConfig): Repositories {
  const ctx: RepositoryContext = {
    client,
    keys: createKeys(config.redis.keyPrefix),
    lowStockThreshold: config.store.lowStockThreshold,
    cartTtlSeconds: config.store.cartTtlSeconds,
  };
  return {
    products: new ProductRepository(ctx),
    inventory: new InventoryRepository(ctx),
    customers: new CustomerRepository(ctx),
    carts: new CartRepository(ctx),
    orders: new OrderRepository(ctx),
    admins: new AdminRepository(ctx),
    rateLimits: new RateLimitRepository(ctx),
  };
}

export type { RepositoryContext } from './context.js';
export {
  AdminRepository,
  CartRepository,
  CustomerRepository,
  InventoryRepository,
  OrderRepository,
  ProductRepository,
  RateLimitRepository,
};
