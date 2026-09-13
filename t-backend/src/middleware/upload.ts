import { Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import { AppError } from './errorHandler';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const MAX_FOOD_IMAGE_BYTES = 8 * 1024 * 1024;

const AVATAR_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Phone cameras default to HEIC on iOS, and Gemini reads it natively. */
const FOOD_IMAGE_TYPES = [...AVATAR_IMAGE_TYPES, 'image/heic', 'image/heif'];

interface ImageUploadOptions {
  field: string;
  maxBytes: number;
  allowedTypes: readonly string[];
  typeMessage: string;
}

/**
 * Builds a single-image upload handler. Files stay in memory: avatars go
 * straight to Cloudinary and food photos straight to the AI, so neither needs
 * to touch disk. Multer's own errors (size limit, unexpected field) are mapped
 * onto the shared error shape so every route fails the same way.
 */
function createImageUpload(options: ImageUploadOptions): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: options.maxBytes, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!options.allowedTypes.includes(file.mimetype)) {
        callback(new AppError(options.typeMessage, 400, 'UNSUPPORTED_IMAGE_TYPE'));
        return;
      }
      callback(null, true);
    },
  }).single(options.field);

  const maxMegabytes = Math.round(options.maxBytes / (1024 * 1024));

  return (req: Request, res: Response, next: NextFunction): void => {
    upload(req, res, (error: unknown) => {
      if (!(error instanceof multer.MulterError)) {
        next(error ?? undefined);
        return;
      }

      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(`Image must be ${maxMegabytes}MB or smaller`, 413, 'IMAGE_TOO_LARGE'));
        return;
      }
      next(new AppError('Could not read the uploaded file', 400, 'UPLOAD_UNREADABLE'));
    });
  };
}

export const uploadAvatarFile = createImageUpload({
  field: 'avatar',
  maxBytes: MAX_AVATAR_BYTES,
  allowedTypes: AVATAR_IMAGE_TYPES,
  typeMessage: 'Only JPEG, PNG, and WebP images are supported',
});

export const uploadFoodImageFile = createImageUpload({
  field: 'image',
  maxBytes: MAX_FOOD_IMAGE_BYTES,
  allowedTypes: FOOD_IMAGE_TYPES,
  typeMessage: 'Only JPEG, PNG, WebP, and HEIC photos are supported',
});
