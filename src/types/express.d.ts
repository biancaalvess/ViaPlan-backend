// ============================================================================
// TIPOS PERSONALIZADOS PARA EXPRESS
// ============================================================================

import { AuthUser } from '../middleware/auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
