import { Router } from 'express';
import { createHealthRouter, type PingableStore } from './health.js';

export interface RouteDependencies {
  redis: PingableStore;
}

/**
 * Mounts every API router under /api. Feature routers (products, cart,
 * inventory, orders) are added here as they are implemented.
 */
export function createApiRouter(deps: RouteDependencies): Router {
  const api = Router();
  api.use('/health', createHealthRouter(deps.redis));
  return api;
}
