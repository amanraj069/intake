import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { deleteAvatarImage, uploadAvatarImage } from '../lib/cloudinary';
import { toUserResponse, type UserResponse } from '../lib/userResponse';

/**
 * Uploads a new avatar for the user and points their profile at it.
 *
 * Cloudinary is keyed on the user id, so a re-upload overwrites the previous
 * asset in place and no explicit cleanup is needed here.
 */
export async function replaceAvatar(userId: string, fileBuffer: Buffer): Promise<UserResponse> {
  const image = await uploadAvatarImage(fileBuffer, userId);

  const user = await User.findByIdAndUpdate(
    userId,
    { avatarUrl: image.url, avatarPublicId: image.publicId },
    { new: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return toUserResponse(user);
}

/**
 * Clears the user's avatar and destroys the Cloudinary asset behind it.
 *
 * A failed remote delete must not strand the user with an avatar they asked to
 * remove, so the local record is cleared regardless and the orphaned asset is
 * only logged.
 */
export async function removeAvatar(userId: string): Promise<UserResponse> {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.avatarUrl) {
    throw new AppError('You do not have a profile picture to remove', 400);
  }

  const publicId = user.avatarPublicId;

  user.avatarUrl = undefined;
  user.avatarPublicId = undefined;
  await user.save();

  if (publicId) {
    await deleteAvatarImage(publicId).catch((error: unknown) => {
      console.error('[Cloudinary] Failed to delete avatar asset:', error);
    });
  }

  return toUserResponse(user);
}
