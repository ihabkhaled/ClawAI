/** The eight bytes every PNG file starts with. A mask is recognised by these, never by its mime type. */
export const PNG_SIGNATURE: readonly number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** PNG IHDR: width at byte 16, height at byte 20 (big-endian uint32), colour type at byte 25. */
export const PNG_IHDR_WIDTH_OFFSET = 16;
export const PNG_IHDR_HEIGHT_OFFSET = 20;
export const PNG_COLOR_TYPE_OFFSET = 25;
export const PNG_HEADER_MIN_BYTES = 26;

/** PNG colour types that carry alpha: grey+alpha (4) and RGBA (6). */
export const PNG_ALPHA_COLOR_TYPES: readonly number[] = [4, 6];

/** JPEG start-of-frame markers that carry the frame size (SOF0..SOF15 minus DHT/JPG/DAC). */
export const JPEG_SOF_MARKERS: readonly number[] = [
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
];
export const JPEG_MARKER_PREFIX = 0xff;
export const JPEG_START_OF_IMAGE = 0xd8;

/**
 * Largest mask accepted: 4 MB of PNG — OpenAI's `/images/edits` limit for a
 * mask. Checked on the decoded bytes, before anything is sent upstream.
 */
export const IMAGE_MASK_MAX_BYTES = 4 * 1024 * 1024;

/** OpenAI `POST /v1/images/edits` (multipart). */
export const OPENAI_EDIT_PATH = '/images/edits';
export const OPENAI_EDIT_IMAGE_FIELD = 'image[]';
export const OPENAI_EDIT_MASK_FIELD = 'mask';
export const OPENAI_EDIT_SOURCE_FILENAME = 'source.png';
export const OPENAI_EDIT_MASK_FILENAME = 'mask.png';
export const OPENAI_EDIT_TIMEOUT_MS = 180_000;
export const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
export const PNG_MIME_TYPE = 'image/png';
