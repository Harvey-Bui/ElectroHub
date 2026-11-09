import type { AppConfig } from '../config.js';
import type { Repositories } from '../repositories/index.js';
import { AuthService } from './authService.js';
import { CartService } from './cartService.js';
import { CatalogService } from './catalogService.js';
import { DashboardService } from './dashboardService.js';
import { OrderService } from './orderService.js';

export interface Services {
  catalog: CatalogService;
  cart: CartService;
  orders: OrderService;
  auth: AuthService;
  dashboard: DashboardService;
}

export function createServices(
  repos: Repositories,
  config: Pick<AppConfig, 'store' | 'security'>,
): Services {
  const catalog = new CatalogService(repos);
  return {
    catalog,
    cart: new CartService(repos, config.store),
    orders: new OrderService(repos, config.store),
    auth: new AuthService(repos, config.security),
    dashboard: new DashboardService(repos, catalog),
  };
}

export { AuthService, CartService, CatalogService, DashboardService, OrderService };
