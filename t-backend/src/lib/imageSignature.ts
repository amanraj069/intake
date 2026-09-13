/**
 * Identifies an image from its leading bytes. The multipart `Content-Type` is
 * whatever the client claims, so a renamed PDF or a truncated upload would
 * otherwise reach the AI and fail there with a far less useful error.
 */
export type DetectedImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';

function hasBytes(buffer: Buffer, offset: number, bytes: readonly number[]): boolean {
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

function hasAscii(buffer: Buffer, offset: number, text: string): boolean {
  return buffer.toString('latin1', offset, offset + text.length) === text;
}

/** HEIC/HEIF files are ISO boxes: `ftyp` at byte 4, then a brand naming the codec. */
const HEIF_BRANDS = ['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'];

export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length < 12) return null;

  if (hasBytes(buffer, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (hasBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (hasAscii(buffer, 0, 'RIFF') && hasAscii(buffer, 8, 'WEBP')) return 'image/webp';
  if (hasAscii(buffer, 4, 'ftyp') && HEIF_BRANDS.includes(buffer.toString('latin1', 8, 12))) {
    return 'image/heic';
  }

  return null;
}
