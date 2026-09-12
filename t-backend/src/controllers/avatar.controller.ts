import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import { AppError } from '../middleware/errorHandler';
import * as avatarService from '../services/avatar.service';

/**
 * POST /auth/avatar
 * Accepts a single `avatar` image file and returns the updated user.
 */
export async function uploadAvatar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!req.file) {
      throw new AppError('An image file is required', 400);
    }

    const user = await avatarService.replaceAvatar(userId, req.file.buffer);

    res.json({
      success: true,
      message: 'Profile picture updated',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /auth/avatar
 * Removes the user's profile picture and returns the updated user.
 */
export async function deleteAvatar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await avatarService.removeAvatar(getAuthenticatedUserId(req));

    res.json({
      success: true,
      message: 'Profile picture removed',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}
