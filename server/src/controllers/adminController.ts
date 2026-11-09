import type { RequestHandler } from 'express';
import type { AppConfig } from '../config.js';
import { adminToken } from '../middleware/adminAuth.js';
import { ADMIN_COOKIE, adminCookieOptions, clearOptions } from '../lib/cookies.js';
import {
  adminCreateProductBody,
  adminLoginBody,
  adminOrdersQuery,
  adminUpdateProductBody,
  lowStockQuery,
  orderIdParams,
  productIdParams,
  updateOrderStatusBody,
} from '../schemas/api.js';
import type { Services } from '../services/index.js';
import { sendData, sendPage } from './respond.js';

/** Administrator endpoints: session, products, orders, inventory and dashboard. */
export function createAdminController(services: Services, security: AppConfig['security']) {
  const cookieOptions = adminCookieOptions(security);

  // ── Session ─────────────────────────────────────────────────────────────
  const login: RequestHandler = async (req, res) => {
    const { username, password } = adminLoginBody.parse(req.body);
    const { token, session } = await services.auth.login(username, password, req.ip ?? 'unknown');
    res.setHeader('Cache-Control', 'no-store');
    res.cookie(ADMIN_COOKIE, token, cookieOptions);
    sendData(res, { username: session.username, expiresAt: session.expiresAt });
  };

  const logout: RequestHandler = async (req, res) => {
    await services.auth.logout(adminToken(req.signedCookies));
    res.clearCookie(ADMIN_COOKIE, clearOptions(cookieOptions));
    res.status(204).end();
  };

  const me: RequestHandler = (req, res) => {
    sendData(res, { username: req.admin!.username, expiresAt: req.admin!.expiresAt });
  };

  // ── Products ────────────────────────────────────────────────────────────
  const createProduct: RequestHandler = async (req, res) => {
    const product = await services.catalog.createProduct(adminCreateProductBody.parse(req.body));
    res.location(`/api/products/${product.id}`);
    sendData(res, product, 201);
  };

  const updateProduct: RequestHandler = async (req, res) => {
    const { id } = productIdParams.parse(req.params);
    const body = adminUpdateProductBody.parse(req.body);
    sendData(res, await services.catalog.updateProduct(id, body));
  };

  const deleteProduct: RequestHandler = async (req, res) => {
    const { id } = productIdParams.parse(req.params);
    await services.catalog.deleteProduct(id);
    res.status(204).end();
  };

  // ── Orders ──────────────────────────────────────────────────────────────
  const listOrders: RequestHandler = async (req, res) => {
    sendPage(res, await services.orders.listForAdmin(adminOrdersQuery.parse(req.query)));
  };

  const getOrder: RequestHandler = async (req, res) => {
    const { id } = orderIdParams.parse(req.params);
    sendData(res, await services.orders.getForAdmin(id));
  };

  const updateOrderStatus: RequestHandler = async (req, res) => {
    const { id } = orderIdParams.parse(req.params);
    const { status } = updateOrderStatusBody.parse(req.body);
    sendData(res, await services.orders.updateStatusForAdmin(id, status));
  };

  // ── Inventory & dashboard ───────────────────────────────────────────────
  const lowStock: RequestHandler = async (req, res) => {
    const { limit } = lowStockQuery.parse(req.query);
    sendData(res, await services.catalog.lowStock(limit));
  };

  const dashboard: RequestHandler = async (_req, res) => {
    sendData(res, await services.dashboard.overview());
  };

  return {
    login,
    logout,
    me,
    createProduct,
    updateProduct,
    deleteProduct,
    listOrders,
    getOrder,
    updateOrderStatus,
    lowStock,
    dashboard,
  };
}
