import { Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import { AppError } from './errorHandler';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const MAX_FOOD_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_FOOD_DIARY_PDF_BYTES = 5 * 1024 * 1024;

const AVATAR_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Phone cameras default to HEIC on iOS, and Gemini reads it natively. */
const FOOD_IMAGE_TYPES = [...AVATAR_IMAGE_TYPES, 'image/heic', 'image/heif'];

interface SingleFileUploadOptions {
  field: string;
  maxBytes: number;
  allowedTypes: readonly string[];
  typeMessage: string;
  /** What the file is, for the size message, e.g. "Image". */
  fileLabel: string;
  typeErrorCode: string;
  tooLargeErrorCode: string;
}

/**
 * Builds a single-file upload handler. Files stay in memory: avatars go
 * straight to Cloudinary, food photos and diary PDFs straight to parsing and
 * the AI, so none needs to touch disk. Multer's own errors (size limit,
 * unexpected field) are mapped onto the shared error shape so every route
 * fails the same way.
 */
function createSingleFileUpload(options: SingleFileUploadOptions): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: options.maxBytes, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!options.allowedTypes.includes(file.mimetype)) {
        callback(new AppError(options.typeMessage, 400, options.typeErrorCode));
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
        const message = `${options.fileLabel} must be ${maxMegabytes}MB or smaller`;
        next(new AppError(message, 413, options.tooLargeErrorCode));
        return;
      }
      next(new AppError('Could not read the uploaded file', 400, 'UPLOAD_UNREADABLE'));
    });
  };
}

export const uploadAvatarFile = createSingleFileUpload({
  field: 'avatar',
  maxBytes: MAX_AVATAR_BYTES,
  allowedTypes: AVATAR_IMAGE_TYPES,
  typeMessage: 'Only JPEG, PNG, and WebP images are supported',
  fileLabel: 'Image',
  typeErrorCode: 'UNSUPPORTED_IMAGE_TYPE',
  tooLargeErrorCode: 'IMAGE_TOO_LARGE',
});

export const uploadFoodImageFile = createSingleFileUpload({
  field: 'image',
  maxBytes: MAX_FOOD_IMAGE_BYTES,
  allowedTypes: FOOD_IMAGE_TYPES,
  typeMessage: 'Only JPEG, PNG, WebP, and HEIC photos are supported',
  fileLabel: 'Image',
  typeErrorCode: 'UNSUPPORTED_IMAGE_TYPE',
  tooLargeErrorCode: 'IMAGE_TOO_LARGE',
});

export const uploadFoodDiaryPdf = createSingleFileUpload({
  field: 'file',
  maxBytes: MAX_FOOD_DIARY_PDF_BYTES,
  allowedTypes: ['application/pdf'],
  typeMessage: 'Only PDF files can be imported',
  fileLabel: 'PDF',
  typeErrorCode: 'UNSUPPORTED_FILE_TYPE',
  tooLargeErrorCode: 'PDF_TOO_LARGE',
});
