/** Mirrors the server's food photo upload limits, so a bad file fails before the round trip. */
export const MAX_FOOD_IMAGE_BYTES = 8 * 1024 * 1024;

export const ACCEPTED_FOOD_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

/** Long edge after downscaling: plenty to read a nutrition label, a fraction of a phone photo's size. */
const MAX_UPLOAD_EDGE_PX = 1600;
const UPLOAD_JPEG_QUALITY = 0.85;

export function foodImageFileError(file: File): string | null {
  // Some browsers report HEIC photos with an empty type, so fall back to the extension.
  const isHeicByName = /\.(heic|heif)$/i.test(file.name);

  if (!ACCEPTED_FOOD_IMAGE_TYPES.includes(file.type) && !isHeicByName) {
    return "Choose a JPEG, PNG, WebP, or HEIC photo.";
  }

  if (file.size > MAX_FOOD_IMAGE_BYTES) {
    return "Photo must be 8MB or smaller.";
  }

  return null;
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", UPLOAD_JPEG_QUALITY));
}

/**
 * Shrinks a large photo before upload. Phone photos are often 3-8MB, and the
 * AI reads a 1600px image just as well, so this mostly buys upload and
 * analysis time. Any file the browser cannot decode (HEIC outside Safari, for
 * example) is sent unchanged: the server accepts it and the AI reads it.
 */
export async function prepareFoodImageForUpload(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Without a declared type the upload would be rejected, and the only
    // accepted file that reaches here untyped is a HEIC picked by extension.
    return file.type ? file : new File([file], file.name, { type: "image/heic" });
  }

  try {
    const scale = Math.min(1, MAX_UPLOAD_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === "image/jpeg") return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const resized = await canvasToJpeg(canvas);
    return resized && resized.size < file.size ? resized : file;
  } finally {
    bitmap.close();
  }
}
