import { Request } from 'express';
import { AppError } from '../middleware/errorHandler';

/**
 * Narrows the optional `req.user` that requireAuth attaches down to a concrete
 * id. Routes behind requireAuth always have one; the throw is a type-level
 * safety net so controllers never need a non-null assertion or a cast.
 */
export function getAuthenticatedUserId(req: Request): string {
  const userId = req.user?._id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  return userId;
}
