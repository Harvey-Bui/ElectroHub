import type { RequestHandler } from 'express';
import { requireCustomerId } from '../middleware/customerSession.js';
import { addCartItemBody, cartItemParams, updateCartItemBody } from '../schemas/api.js';
import type { CartService } from '../services/cartService.js';
import { sendData } from './respond.js';

/** Shopping cart of the shopper identified by the customer cookie. */
export function createCartController(cart: CartService) {
  const get: RequestHandler = async (req, res) => {
    sendData(res, await cart.getCart(requireCustomerId(req.customerId)));
  };

  const addItem: RequestHandler = async (req, res) => {
    const { productId, quantity } = addCartItemBody.parse(req.body);
    sendData(res, await cart.addItem(requireCustomerId(req.customerId), productId, quantity), 201);
  };

  const updateItem: RequestHandler = async (req, res) => {
    const { productId } = cartItemParams.parse(req.params);
    const { quantity } = updateCartItemBody.parse(req.body);
    sendData(res, await cart.updateItem(requireCustomerId(req.customerId), productId, quantity));
  };

  const removeItem: RequestHandler = async (req, res) => {
    const { productId } = cartItemParams.parse(req.params);
    sendData(res, await cart.removeItem(requireCustomerId(req.customerId), productId));
  };

  const clear: RequestHandler = async (req, res) => {
    await cart.clear(requireCustomerId(req.customerId));
    res.status(204).end();
  };

  return { get, addItem, updateItem, removeItem, clear };
}
