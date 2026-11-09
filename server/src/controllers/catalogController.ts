import type { RequestHandler } from 'express';
import {
  categoryParams,
  featuredQuery,
  productIdParams,
  productListQuery,
} from '../schemas/api.js';
import type { CatalogService } from '../services/catalogService.js';
import { sendData, sendPage } from './respond.js';

/** Public catalogue: product listing, details, categories, featured. */
export function createCatalogController(catalog: CatalogService) {
  const list: RequestHandler = async (req, res) => {
    sendPage(res, await catalog.listProducts(productListQuery.parse(req.query)));
  };

  const byCategory: RequestHandler = async (req, res) => {
    const { category } = categoryParams.parse(req.params);
    const slug = catalog.parseCategory(category);
    const query = productListQuery.parse({ ...req.query, category: slug });
    sendPage(res, await catalog.listProducts(query));
  };

  const featured: RequestHandler = async (req, res) => {
    const { limit } = featuredQuery.parse(req.query);
    sendData(res, await catalog.featured(limit));
  };

  const getOne: RequestHandler = async (req, res) => {
    const { id } = productIdParams.parse(req.params);
    sendData(res, await catalog.getProduct(id));
  };

  const categories: RequestHandler = async (_req, res) => {
    sendData(res, await catalog.categories());
  };

  return { list, byCategory, featured, getOne, categories };
}
