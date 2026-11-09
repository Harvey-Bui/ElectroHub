import type { RequestHandler } from 'express';
import { requireCustomerId } from '../middleware/customerSession.js';
import { checkoutBody, orderIdParams, paginationQuery } from '../schemas/api.js';
import type { OrderService } from '../services/orderService.js';
import { sendData, sendPage } from './respond.js';

/** Checkout and the shopper's own orders. */
export function createOrderController(orders: OrderService) {
  const checkout: RequestHandler = async (req, res) => {
    const body = checkoutBody.parse(req.body);
    const order = await orders.checkout(requireCustomerId(req.customerId), body);
    res.location(`/api/orders/${order.id}`);
    sendData(res, order, 201);
  };

  const list: RequestHandler = async (req, res) => {
    const query = paginationQuery.parse(req.query);
    sendPage(res, await orders.listForCustomer(requireCustomerId(req.customerId), query));
  };

  const getOne: RequestHandler = async (req, res) => {
    const { id } = orderIdParams.parse(req.params);
    sendData(res, await orders.getForCustomer(requireCustomerId(req.customerId), id));
  };

  const cancel: RequestHandler = async (req, res) => {
    const { id } = orderIdParams.parse(req.params);
    sendData(res, await orders.cancelForCustomer(requireCustomerId(req.customerId), id));
  };

  return { checkout, list, getOne, cancel };
}
