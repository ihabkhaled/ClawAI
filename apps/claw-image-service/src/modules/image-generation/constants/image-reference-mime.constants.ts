/**
 * Magic-byte signatures of the reference image types a bare-base64 reference
 * may be stored as. The type is read from the bytes, never from the declared
 * mime type: a caller's `referenceImageMimeType` is a hint, not evidence.
 */
export const REFERENCE_PNG_SIGNATURE: readonly number[] = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
];
export const REFERENCE_JPEG_SIGNATURE: readonly number[] = [0xff, 0xd8, 0xff];
export const REFERENCE_GIF_SIGNATURE: readonly number[] = [0x47, 0x49, 0x46, 0x38];
/** WEBP: "RIFF" at 0 and "WEBP" at 8. */
export const REFERENCE_RIFF_SIGNATURE: readonly number[] = [0x52, 0x49, 0x46, 0x46];
export const REFERENCE_WEBP_SIGNATURE: readonly number[] = [0x57, 0x45, 0x42, 0x50];
export const REFERENCE_WEBP_TAG_OFFSET = 8;

/** Base64 characters decoded to sniff the type (18 bytes, enough for every signature). */
export const REFERENCE_SNIFF_BASE64_CHARS = 24;

/** Largest decoded reference stored: 25 MB, the same cap as the base64 limit. */
export const REFERENCE_MAX_BYTES = 25 * 1024 * 1024;

/** File name prefix a stored bare-base64 reference gets in the owner's files. */
export const REFERENCE_STORED_FILENAME_PREFIX = 'image-reference';

/** Extension per sniffed mime type. */
export const REFERENCE_MIME_EXTENSIONS: ReadonlyMap<string, string> = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
]);
