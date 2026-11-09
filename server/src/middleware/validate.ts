import type { RequestHandler } from 'express';
import type { z } from 'zod';

/**
 * Validates and replaces `req.body` with the parsed (typed, defaulted) value.
 * Validation failures are forwarded to the error handler as a ZodError (-> 400).
 */
export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Parses `req.query` / `req.params`. In Express 5 `req.query` is read-only,
 * so the parsed value is returned to the caller instead of being reassigned.
 */
export function parseWith<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  return schema.parse(input);
}
