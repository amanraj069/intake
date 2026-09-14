import { AppError } from '../middleware/errorHandler';
import { InlineImage } from './gemini/geminiClient';
import { detectImageType } from './imageSignature';

/** The bytes decide the media type, not the client's declared Content-Type. */
export function toInlineImage(imageBytes: Buffer): InlineImage {
  const detectedType = detectImageType(imageBytes);

  if (!detectedType) {
    throw new AppError('That file is not a readable image. Try a JPEG or PNG photo.', 422, 'IMAGE_UNREADABLE');
  }

  return { mimeType: detectedType, data: imageBytes };
}
