import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from './errorHandler';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Avatars go straight to Cloudinary, so the file never needs to touch disk.
 */
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      callback(new AppError('Only JPEG, PNG, and WebP images are supported', 400));
      return;
    }
    callback(null, true);
  },
}).single('avatar');

/**
 * Wraps multer so its own errors (size limit, unexpected field) surface through
 * the shared error handler with the same JSON shape as every other route.
 */
export function uploadAvatarFile(req: Request, res: Response, next: NextFunction): void {
  avatarUpload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 5MB or smaller'
          : 'Could not read the uploaded file';
      next(new AppError(message, 400));
      return;
    }

    next(error ?? undefined);
  });
}
