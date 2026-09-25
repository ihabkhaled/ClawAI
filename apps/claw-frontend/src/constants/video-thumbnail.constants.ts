/**
 * The only image types a stored video thumbnail may be rendered as. The
 * pipeline writes JPEG; anything else in `thumbnailMimeType` is refused rather
 * than interpolated into a `data:` URL.
 */
export const VIDEO_THUMBNAIL_ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** When the row predates `thumbnailMimeType`: what the pipeline has always written. */
export const VIDEO_THUMBNAIL_DEFAULT_MIME_TYPE = 'image/jpeg';

/**
 * 96 KB of image is 131 072 base64 characters; a little headroom for padding.
 * A larger value is not what the pipeline writes, so it is not rendered.
 */
export const VIDEO_THUMBNAIL_MAX_BASE64_CHARS = 131_076;

/** Standard base64 alphabet only — no whitespace, no URL-breaking characters. */
export const VIDEO_THUMBNAIL_BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export const VIDEO_THUMBNAIL_ALT_KEY = 'mediaUi.video.thumbnailAlt';
export const VIDEO_DURATION_LABEL_KEY = 'mediaUi.video.duration';
