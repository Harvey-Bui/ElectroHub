import { Router } from 'express';
import { createCatalogController } from '../controllers/catalogController.js';
import type { CatalogService } from '../services/catalogService.js';

/** Mounted at /api. Static paths are registered before `/products/:id`. */
export function createCatalogRouter(catalog: CatalogService): Router {
  const c = createCatalogController(catalog);
  const router = Router();

  router.get('/categories', c.categories);
  router.get('/products', c.list);
  router.get('/products/featured', c.featured);
  router.get('/products/category/:category', c.byCategory);
  router.get('/products/:id', c.getOne);

  return router;
}
