import {
  VIDEO_SOURCE_IMAGE_MAX_BASE64_LENGTH,
  VIDEO_SOURCE_IMAGE_MAX_BYTES,
  VIDEO_SOURCE_IMAGE_MIME_TYPES,
} from '../constants/video-generation.constants';
import type { VideoSourceFileResponse, VideoSourceImage } from '../types/video-generation.types';

/** The image type the leading bytes prove, or null: the declared mime type is a claim, not proof. */
export function sniffVideoSourceMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    return 'image/png';
  }
  const isWebp =
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  return isWebp ? 'image/webp' : null;
}

/**
 * Turns file-service's reply into a provider-ready image, or null when it is not
 * usable: no bytes, too large, a declared type outside JPEG/PNG/WebP, or bytes that
 * are not what the declared type says. The mime type sent upstream is the sniffed one.
 */
export function toVideoSourceImage(file: VideoSourceFileResponse): VideoSourceImage | null {
  const base64 = file.content ?? '';
  if (base64.length === 0 || base64.length > VIDEO_SOURCE_IMAGE_MAX_BASE64_LENGTH) {
    return null;
  }
  const declared = file.mimeType.trim().toLowerCase();
  if (!VIDEO_SOURCE_IMAGE_MIME_TYPES.includes(declared)) {
    return null;
  }
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0 || bytes.length > VIDEO_SOURCE_IMAGE_MAX_BYTES) {
    return null;
  }
  const sniffed = sniffVideoSourceMime(bytes);
  return sniffed === declared ? { base64, mimeType: sniffed } : null;
}
