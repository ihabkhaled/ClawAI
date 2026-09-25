import { VideoProcessingFailureReason } from '@claw/shared-types';
import { ffprobeOutputSchema, type FfprobeStream } from '../dto/ffprobe-output.dto';
import { VIDEO_MAX_DURATION_MS, VIDEO_MAX_PIXELS } from '../constants/video-processing.constants';
import { type VideoProbeSummary } from '../types/video-processing.types';

// Multimodal batch 7 — turning ffprobe's JSON into facts, and facts into a
// verdict. Pure: no process, no filesystem, so the whole matrix is unit-tested.

/** ffprobe's decimal-seconds string → whole milliseconds; 0 when unusable. */
export function secondsStringToMs(value: string | undefined): number {
  const seconds = value === undefined ? Number.NaN : Number.parseFloat(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : 0;
}

/** `"30000/1001"` → 29.97 (three decimals); null when absent or `0/0`. */
export function parseFrameRate(value: string | undefined): number | null {
  const [numerator, denominator] = (value ?? '')
    .split('/')
    .map((part) => Number.parseInt(part, 10));
  const usable =
    numerator !== undefined &&
    denominator !== undefined &&
    Number.isFinite(numerator) &&
    Number.isFinite(denominator) &&
    numerator > 0 &&
    denominator > 0;
  return usable ? Math.round((numerator / denominator) * 1000) / 1000 : null;
}

function firstStream(streams: FfprobeStream[], codecType: string): FfprobeStream | undefined {
  return streams.find((stream) => stream.codec_type === codecType);
}

/**
 * Parses ffprobe's stdout. Returns null for anything that is not ffprobe's
 * JSON — malformed JSON, a wrong shape, a stream list past the cap — which the
 * caller records as a corrupt container.
 */
export function parseProbeOutput(stdout: string): VideoProbeSummary | null {
  let raw: unknown;
  try {
    raw = JSON.parse(stdout);
  } catch {
    return null;
  }
  const parsed = ffprobeOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  const { streams, format } = parsed.data;
  const video = firstStream(streams, 'video');
  const audio = firstStream(streams, 'audio');
  const formatDuration = secondsStringToMs(format?.duration);
  return {
    hasVideo: video !== undefined,
    durationMs: formatDuration > 0 ? formatDuration : secondsStringToMs(video?.duration),
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    fps: parseFrameRate(video?.avg_frame_rate) ?? parseFrameRate(video?.r_frame_rate),
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    hasAudio: audio !== undefined,
    container: format?.format_name ?? null,
  };
}

/**
 * The GLOBAL policy, applied before any plan is consulted. Null means the
 * video may proceed; otherwise the reason it may not.
 */
export function validateProbeSummary(
  summary: VideoProbeSummary,
): VideoProcessingFailureReason | null {
  if (!summary.hasVideo || summary.width <= 0 || summary.height <= 0) {
    return VideoProcessingFailureReason.NO_VIDEO_STREAM;
  }
  if (summary.durationMs <= 0) {
    return VideoProcessingFailureReason.INVALID_DURATION;
  }
  if (summary.width * summary.height > VIDEO_MAX_PIXELS) {
    return VideoProcessingFailureReason.DIMENSIONS_TOO_LARGE;
  }
  return summary.durationMs > VIDEO_MAX_DURATION_MS
    ? VideoProcessingFailureReason.DURATION_TOO_LONG
    : null;
}
