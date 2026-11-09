import type { Response } from 'express';
import type { Paginated } from '../services/catalogService.js';

/** Single resource or plain payload: `{ data }`. */
export function sendData<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

/** Collections: `{ data: [...], pagination: { page, limit, total, totalPages } }`. */
export function sendPage<T>(res: Response, page: Paginated<T>): void {
  const { items, ...pagination } = page;
  res.json({ data: items, pagination });
}
