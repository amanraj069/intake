export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Mirrors the server's upload filter so an oversized file fails before the round trip. */
export function avatarFileError(file: File): string | null {
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    return "Choose a JPEG, PNG, or WebP image.";
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return "Image must be 5MB or smaller.";
  }

  return null;
}
