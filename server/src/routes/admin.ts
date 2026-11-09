import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { createAdminController } from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import type { Services } from '../services/index.js';

/** Mounted at /api/admin. Everything except login/logout requires an admin session. */
export function createAdminRouter(services: Services, security: AppConfig['security']): Router {
  const c = createAdminController(services, security);
  const router = Router();

  router.post('/login', c.login);
  router.post('/logout', c.logout);

  router.use(requireAdmin(services.auth));

  router.get('/me', c.me);
  router.get('/dashboard', c.dashboard);

  router.post('/products', c.createProduct);
  router.put('/products/:id', c.updateProduct);
  router.delete('/products/:id', c.deleteProduct);

  router.get('/orders', c.listOrders);
  router.get('/orders/:id', c.getOrder);
  router.put('/orders/:id/status', c.updateOrderStatus);

  router.get('/inventory/low-stock', c.lowStock);

  return router;
}
