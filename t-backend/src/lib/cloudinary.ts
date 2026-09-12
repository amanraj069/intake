import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { AppError } from '../middleware/errorHandler';

const AVATAR_FOLDER = 'intake/avatars';

/**
 * Cloudinary bundles the cloud name into `CLOUDINARY_URL`, so either that
 * single variable or an explicit `CLOUDINARY_CLOUD_NAME` is enough to run.
 */
function readCloudName(): string | undefined {
  if (process.env.CLOUDINARY_CLOUD_NAME) return process.env.CLOUDINARY_CLOUD_NAME;

  const url = process.env.CLOUDINARY_URL;
  if (!url) return undefined;

  return url.split('@')[1] || undefined;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    readCloudName() && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}

function configuredClient(): typeof cloudinary {
  if (!isCloudinaryConfigured()) {
    throw new AppError('Image uploads are not configured on this server', 503);
  }

  cloudinary.config({
    cloud_name: readCloudName(),
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
}

export interface UploadedImage {
  url: string;
  publicId: string;
}

/**
 * Uploads an in-memory image buffer as the given user's avatar. The square
 * face-aware crop happens at upload time so the stored asset already matches
 * the shape every avatar slot in the UI renders.
 */
export function uploadAvatarImage(fileBuffer: Buffer, userId: string): Promise<UploadedImage> {
  const client = configuredClient();

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder: AVATAR_FOLDER,
        public_id: userId,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        transformation: [
          { width: 512, height: 512, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(new AppError('Could not upload the image. Please try again.', 502));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    stream.end(fileBuffer);
  });
}

export async function deleteAvatarImage(publicId: string): Promise<void> {
  await configuredClient().uploader.destroy(publicId, { resource_type: 'image' });
}
