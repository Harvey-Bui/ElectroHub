import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { createCartController } from '../controllers/cartController.js';
import { createOrderController } from '../controllers/orderController.js';
import { customerSession } from '../middleware/customerSession.js';
import type { CartService } from '../services/cartService.js';
import type { OrderService } from '../services/orderService.js';

/**
 * Shopper endpoints (mounted at /api). Every route runs behind
 * `customerSession`, which issues or reads the HTTP-only customer cookie.
 */
export function createShopRouter(
  cart: CartService,
  orders: OrderService,
  security: AppConfig['security'],
): Router {
  const cartC = createCartController(cart);
  const orderC = createOrderController(orders);
  const router = Router();
  const session = customerSession(security);

  router.get('/cart', session, cartC.get);
  router.delete('/cart', session, cartC.clear);
  router.post('/cart/items', session, cartC.addItem);
  router.put('/cart/items/:productId', session, cartC.updateItem);
  router.delete('/cart/items/:productId', session, cartC.removeItem);

  router.post('/checkout', session, orderC.checkout);

  router.get('/orders', session, orderC.list);
  router.get('/orders/:id', session, orderC.getOne);
  router.post('/orders/:id/cancel', session, orderC.cancel);

  return router;
}
