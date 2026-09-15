import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';
import { AppError } from '../middleware/errorHandler';

const AVATAR_FOLDER = 'intake/avatars';
const CHAT_IMAGE_FOLDER = 'intake/chat';
const MEAL_IMAGE_FOLDER = 'intake/meals';

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

function uploadImageBuffer(fileBuffer: Buffer, options: UploadApiOptions): Promise<UploadedImage> {
  const client = configuredClient();

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      { ...options, resource_type: 'image' },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          console.error('[Cloudinary] Upload failed:', error);
          reject(new AppError('Could not upload the image. Please try again.', 502, 'IMAGE_UPLOAD_FAILED'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    stream.end(fileBuffer);
  });
}

/**
 * Uploads an in-memory image buffer as the given user's avatar. The square
 * face-aware crop happens at upload time so the stored asset already matches
 * the shape every avatar slot in the UI renders.
 */
export function uploadAvatarImage(fileBuffer: Buffer, userId: string): Promise<UploadedImage> {
  return uploadImageBuffer(fileBuffer, {
    folder: AVATAR_FOLDER,
    public_id: userId,
    overwrite: true,
    invalidate: true,
    transformation: [
      { width: 512, height: 512, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
}

/**
 * Uploads a photo attached to a chat message. It is stored as a JPEG so an
 * iPhone HEIC photo still renders in every browser, and capped in size since
 * the thread only ever shows it as a bubble-sized preview.
 */
export function uploadChatImage(fileBuffer: Buffer, userId: string): Promise<UploadedImage> {
  return uploadImageBuffer(fileBuffer, {
    folder: `${CHAT_IMAGE_FOLDER}/${userId}`,
    format: 'jpg',
    transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto' }],
  });
}

/**
 * Uploads a photo attached to a logged meal. Stored in the user's meal folder
 * in Cloudinary as a JPEG with auto quality and bounded dimensions.
 */
export function uploadMealImage(fileBuffer: Buffer, userId: string): Promise<UploadedImage> {
  return uploadImageBuffer(fileBuffer, mealImageOptions(userId));
}

function mealImageOptions(userId: string): UploadApiOptions {
  return {
    folder: `${MEAL_IMAGE_FOLDER}/${userId}`,
    format: 'jpg',
    transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto' }],
  };
}

/**
 * Copies an already uploaded photo, such as one attached to a chat message,
 * into the user's meal folder. The meal gets its own asset so deleting the
 * chat message and deleting the meal can never break each other's image.
 * Cloudinary fetches the source itself, so the bytes never pass through here.
 */
export async function copyImageToMealFolder(sourceUrl: string, userId: string): Promise<UploadedImage> {
  const client = configuredClient();

  try {
    const result = await client.uploader.upload(sourceUrl, { ...mealImageOptions(userId), resource_type: 'image' });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    console.error('[Cloudinary] Copying an image into the meal folder failed:', error);
    throw new AppError('Could not save the photo with this meal. Please try again.', 502, 'IMAGE_UPLOAD_FAILED');
  }
}

const IMAGE_DOWNLOAD_TIMEOUT_MS = 15 * 1000;

/** Reads a stored photo back, so a retried message can show the model the same image. */
export async function downloadUploadedImage(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`Cloudinary responded ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (cause) {
    console.error('[Cloudinary] Could not download a stored image:', cause);
    throw new AppError('Could not load the photo for this message. Try again.', 502, 'IMAGE_FETCH_FAILED');
  }
}

export async function deleteUploadedImage(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured()) return;
  await configuredClient().uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
}

/**
 * Extracts the public ID from a Cloudinary URL if one was not stored explicitly.
 * e.g. https://res.cloudinary.com/demo/image/upload/v1234/intake/chat/userId/photo.jpg -> intake/chat/userId/photo
 */
export function extractPublicIdFromUrl(url: string): string | undefined {
  try {
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return undefined;
    const pathAfterUpload = url.slice(uploadIndex + '/upload/'.length);
    // Remove transformation/version segments if present (e.g. v123456789/ or w_1600,c_limit/v1234/)
    const withoutVersion = pathAfterUpload.replace(/^.*v\d+\//, '');
    // Remove file extension
    const withoutExtension = withoutVersion.replace(/\.[^/.]+$/, '');
    return withoutExtension || undefined;
  } catch {
    return undefined;
  }
}
