import {
  VIDEO_THUMBNAIL_ALLOWED_MIME_TYPES,
  VIDEO_THUMBNAIL_BASE64_PATTERN,
  VIDEO_THUMBNAIL_DEFAULT_MIME_TYPE,
  VIDEO_THUMBNAIL_MAX_BASE64_CHARS,
} from '@/constants/video-thumbnail.constants';
import type { VideoMediaSummary } from '@/types/file.types';

/**
 * A processed video's stored thumbnail as a `data:` URL, or null.
 *
 * The bytes come from the owner's own file row (GET /files/:id), but they are
 * still validated before they go into an attribute: an allow-listed image
 * type, the plain base64 alphabet, and the pipeline's own size bound. Anything
 * else falls back to the play-icon card — never a broken image.
 */
export function toVideoPosterSrc(media: VideoMediaSummary | null | undefined): string | null {
  const base64 = media?.thumbnailBase64;
  if (base64 === undefined || base64 === null || base64.length === 0) {
    return null;
  }
  if (
    base64.length > VIDEO_THUMBNAIL_MAX_BASE64_CHARS ||
    !VIDEO_THUMBNAIL_BASE64_PATTERN.test(base64)
  ) {
    return null;
  }
  const mimeType = media?.thumbnailMimeType ?? VIDEO_THUMBNAIL_DEFAULT_MIME_TYPE;
  if (!VIDEO_THUMBNAIL_ALLOWED_MIME_TYPES.has(mimeType)) {
    return null;
  }
  return `data:${mimeType};base64,${base64}`;
}

/** The video's length in milliseconds, or null when it is unknown / nonsense. */
export function readVideoDurationMs(media: VideoMediaSummary | null | undefined): number | null {
  const durationMs = media?.durationMs;
  return typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs > 0
    ? durationMs
    : null;
}
