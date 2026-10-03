// Images that no vision provider accepts as uploaded (rule 42 item 8: accepting
// a format obliges us to make it readable). Each is decoded once, at upload, and
// stored as a JPEG, so every reader downstream (OCR, the vision lanes, the
// browser preview) sees a format they all handle.

/** HEIC / HEIF stills as iPhones and Android cameras write them. */
export const HEIF_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

/** Decoded by sharp (libvips). */
export const SHARP_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set(['image/avif', 'image/tiff']);

/** Decoded by bmp-js, then encoded by sharp. */
export const BMP_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set(['image/bmp', 'image/x-ms-bmp']);

/** What a converted image is stored as. */
export const NORMALIZED_IMAGE_MIME_TYPE = 'image/jpeg';
export const NORMALIZED_IMAGE_EXTENSION = '.jpg';
export const NORMALIZED_IMAGE_CODE = 'IMAGE_DECODE_FAILED';

/** heic-convert takes 0..1, sharp takes 1..100. */
export const HEIC_JPEG_QUALITY = 0.9;
export const SHARP_JPEG_QUALITY = 90;

/** Anything flattened out of transparency lands on white, never black. */
export const NORMALIZED_IMAGE_BACKGROUND = '#ffffff';

/**
 * A BMP header states its own size, and `bmp-js` allocates from it. A 100 MB
 * pixel buffer from a 60-byte file is a memory bomb, so the header is read
 * first and anything past this many pixels is refused.
 */
export const BMP_MAX_PIXELS = 64_000_000;
export const BMP_WIDTH_OFFSET = 18;
export const BMP_HEIGHT_OFFSET = 22;
export const BMP_HEADER_MIN_BYTES = 26;
export const BMP_BYTES_PER_PIXEL_RGBA = 4;
export const OPAQUE_ALPHA = 255;
