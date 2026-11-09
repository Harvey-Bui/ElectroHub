import type { AdminSession } from '../repositories/adminRepository.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by `customerSession` from the signed customer cookie. */
      customerId?: string;
      /** Set by `requireAdmin` for authenticated administrator requests. */
      admin?: AdminSession;
    }
  }
}

export {};
