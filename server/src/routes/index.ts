import { Router } from 'express';
import type { AppConfig } from '../config.js';
import type { Services } from '../services/index.js';
import { createAdminRouter } from './admin.js';
import { createCatalogRouter } from './catalog.js';
import { createHealthRouter, type PingableStore } from './health.js';
import { createShopRouter } from './shop.js';

export interface RouteDependencies {
  services: Services;
  health: PingableStore;
  security: AppConfig['security'];
}

/** Mounts every API router under /api. */
export function createApiRouter({ services, health, security }: RouteDependencies): Router {
  const api = Router();
  api.use('/health', createHealthRouter(health));
  api.use('/admin', createAdminRouter(services, security));
  api.use(createCatalogRouter(services.catalog));
  api.use(createShopRouter(services.cart, services.orders, security));
  return api;
}
