import type { VideoFrameImage } from '../types/video-delivery.types';

/**
 * file-service's frames body → frames, or null when it is not the documented
 * shape. Validated by hand: a frame is JPEG base64 that will ride a provider
 * payload, so a malformed element drops the whole answer rather than sending
 * something unchecked.
 */
export function toVideoFrames(data: unknown): VideoFrameImage[] | null {
  if (!Array.isArray(data)) {
    return null;
  }
  const frames: VideoFrameImage[] = [];
  for (const item of data as unknown[]) {
    const frame = toVideoFrame(item);
    if (frame === null) {
      return null;
    }
    frames.push(frame);
  }
  return frames.sort((a, b) => a.timestampMs - b.timestampMs);
}

function toVideoFrame(item: unknown): VideoFrameImage | null {
  if (item === null || typeof item !== 'object') {
    return null;
  }
  const record = item as Record<string, unknown>;
  const { timestampMs, mimeType, base64 } = record;
  const valid =
    typeof timestampMs === 'number' &&
    Number.isInteger(timestampMs) &&
    timestampMs >= 0 &&
    typeof mimeType === 'string' &&
    mimeType.startsWith('image/') &&
    typeof base64 === 'string' &&
    base64.length > 0;
  return valid ? { timestampMs, mimeType, base64 } : null;
}
