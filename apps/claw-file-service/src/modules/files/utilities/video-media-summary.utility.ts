import { videoContentMediaSchema } from '../dto/video-frames.dto';
import { type InternalFileMediaSummary } from '../types/internal-file.types';

/**
 * A video row's probe facts for the internal content contract (multimodal
 * batch 8), or null when the row is not a video or its job has not written
 * `extractionMetadata.media` yet. Never the thumbnail or the transcript
 * segments — the transcript already travels as `extractedText`.
 */
export function readVideoMediaSummary(
  mimeType: string,
  extractionMetadata: unknown,
): InternalFileMediaSummary | null {
  if (!mimeType.startsWith('video/')) {
    return null;
  }
  const parsed = videoContentMediaSchema.safeParse(extractionMetadata);
  if (!parsed.success) {
    return null;
  }
  const { media } = parsed.data;
  return {
    durationMs: media.durationMs ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
    hasAudio: media.hasAudio ?? null,
    failureReason: media.failureReason ?? null,
  };
}
