import { VideoAudioStatus, VideoProcessingFailureReason } from '@claw/shared-types';
import {
  VIDEO_DOCUMENT_MAX_CHARS,
  VIDEO_DOCUMENT_TRUNCATED_NOTE,
  VIDEO_EMPTY_TRANSCRIPT_LINE,
  VIDEO_MAX_DURATION_MS,
  VIDEO_NO_AUDIO_LINE,
  VIDEO_TRANSCRIPT_MAX_SEGMENTS,
  VIDEO_TRANSCRIPT_SEGMENT_MAX_CHARS,
} from '../constants/video-processing.constants';
import {
  type TranscriptLineStart,
  type TranscriptSegment,
  type VideoDocumentInput,
  type VideoFailureDetail,
  type VideoProbeSummary,
} from '../types/video-processing.types';

// Multimodal batch 7 — the text a model is shown for a video, and the
// readable reasons a user is shown when there is none. Pure.

/** 83_000 → `01:23`; 3_723_000 → `1:02:03`. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${String(hours)}:${mmss}` : mmss;
}

/** Whole seconds for a readable limit message, rounded UP (60.4 s reads "61"). */
export function wholeSeconds(ms: number): number {
  return Math.ceil(Math.max(0, ms) / 1000);
}

/** A filename is user text: no brackets, quotes or line breaks inside the header. */
function safeName(filename: string): string {
  return filename
    .replaceAll(/[[\]\r\n"]/g, ' ')
    .trim()
    .slice(0, 200);
}

/** Keeps a transcript inside its bounds: time-clamped, trimmed, non-empty, capped. */
export function boundSegments(
  segments: TranscriptSegment[],
  durationMs: number,
): TranscriptSegment[] {
  const ceiling = durationMs > 0 ? durationMs : VIDEO_MAX_DURATION_MS;
  const bounded: TranscriptSegment[] = [];
  for (const segment of segments) {
    const text = segment.text
      .replaceAll(/\s+/g, ' ')
      .trim()
      .slice(0, VIDEO_TRANSCRIPT_SEGMENT_MAX_CHARS);
    if (text.length === 0) {
      continue;
    }
    const startMs = Math.min(ceiling, Math.max(0, Math.round(segment.startMs)));
    const endMs = Math.min(ceiling, Math.max(startMs, Math.round(segment.endMs)));
    bounded.push({ startMs, endMs, text });
    if (bounded.length >= VIDEO_TRANSCRIPT_MAX_SEGMENTS) {
      break;
    }
  }
  return bounded;
}

/**
 * `[mm:ss] words` or `[h:mm:ss] words` → its start and words; null when the
 * line carries no stamp. Parsed by hand rather than with one backtracking
 * regex, because the input is model output.
 */
function parseStampedLine(line: string): TranscriptLineStart | null {
  const close = line.indexOf(']');
  if (!line.startsWith('[') || close < 0) {
    return null;
  }
  const parts = line.slice(1, close).split(':');
  const wellFormed =
    parts.length >= 2 && parts.length <= 3 && parts.every((part) => /^\d{1,2}$/.test(part));
  if (!wellFormed) {
    return null;
  }
  const seconds = parts.reduce((total, part) => total * 60 + Number.parseInt(part, 10), 0);
  return { startMs: seconds * 1000, text: line.slice(close + 1).trim() };
}

/**
 * Gemini's `[mm:ss] words` lines → segments. Lenient on purpose: a line with
 * no timestamp continues the previous segment, and a transcript with no
 * timestamps at all becomes one segment spanning the whole clip — the words
 * matter more than the times.
 */
export function parseTimestampedTranscript(text: string, durationMs: number): TranscriptSegment[] {
  const starts: TranscriptLineStart[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }
    const stamped = parseStampedLine(line);
    const previous = starts.at(-1);
    if (stamped !== null) {
      starts.push(stamped);
    } else if (previous === undefined) {
      starts.push({ startMs: 0, text: line });
    } else {
      previous.text = `${previous.text} ${line}`;
    }
  }
  const segments = starts.map((entry, index) => ({
    startMs: entry.startMs,
    endMs: starts[index + 1]?.startMs ?? durationMs,
    text: entry.text,
  }));
  return boundSegments(segments, durationMs);
}

function describeHeader(filename: string, summary: VideoProbeSummary): string {
  const parts = [
    `length ${formatClock(summary.durationMs)}`,
    `${String(summary.width)}×${String(summary.height)}`,
  ];
  if (summary.fps !== null) {
    parts.push(`${String(Math.round(summary.fps))} fps`);
  }
  if (summary.videoCodec !== null) {
    parts.push(summary.videoCodec);
  }
  parts.push(summary.hasAudio ? `audio: ${summary.audioCodec ?? 'yes'}` : 'no audio');
  return `Video "${safeName(filename)}" — ${parts.join(', ')}.`;
}

function describeAudio(input: VideoDocumentInput): string[] {
  const { audio } = input;
  if (audio.status === VideoAudioStatus.NO_AUDIO_TRACK) {
    return [VIDEO_NO_AUDIO_LINE];
  }
  if (audio.status !== VideoAudioStatus.TRANSCRIBED) {
    const verb =
      audio.status === VideoAudioStatus.ENTITLEMENTS_UNAVAILABLE ? 'was not' : 'could not be';
    return [`Audio ${verb} transcribed: ${audio.reason ?? 'unknown reason'}.`];
  }
  return audio.segments.length === 0
    ? [VIDEO_EMPTY_TRANSCRIPT_LINE]
    : [
        'Transcript of the audio track (times are from the start of the video):',
        ...audio.segments.map(
          (segment) =>
            `[${formatClock(segment.startMs)}–${formatClock(segment.endMs)}] ${segment.text}`,
        ),
      ];
}

/**
 * The compact, timestamped document written to `extractedText` once, when the
 * job finishes: a metadata header, then the transcript lines (or the reason
 * there are none). Bounded by `VIDEO_DOCUMENT_MAX_CHARS`; a cut is stated.
 */
export function buildVideoDocument(input: VideoDocumentInput): string {
  const lines = [describeHeader(input.filename, input.summary), ...describeAudio(input)];
  const budget = VIDEO_DOCUMENT_MAX_CHARS - VIDEO_DOCUMENT_TRUNCATED_NOTE.length - 1;
  const kept: string[] = [];
  let used = 0;
  for (const line of lines) {
    if (used + line.length + 1 > budget) {
      kept.push(VIDEO_DOCUMENT_TRUNCATED_NOTE);
      break;
    }
    kept.push(line);
    used += line.length + 1;
  }
  return kept.join('\n');
}

/** The readable `extractionError` for a video that was not processed. */
export function describeVideoFailure(
  reason: VideoProcessingFailureReason,
  detail: VideoFailureDetail = {},
): string {
  const summary = detail.summary ?? null;
  switch (reason) {
    case VideoProcessingFailureReason.NO_VIDEO_STREAM:
      return 'This file has no video stream, so it could not be processed as a video.';
    case VideoProcessingFailureReason.INVALID_DURATION:
      return "The video's length could not be read; the file may be damaged.";
    case VideoProcessingFailureReason.DIMENSIONS_TOO_LARGE:
      return `The video is ${String(summary?.width ?? 0)}×${String(summary?.height ?? 0)}; videos larger than 3840×2160 are not processed.`;
    case VideoProcessingFailureReason.DURATION_TOO_LONG:
      return `The video is ${formatClock(summary?.durationMs ?? 0)} long; videos longer than ${formatClock(VIDEO_MAX_DURATION_MS)} are not processed.`;
    case VideoProcessingFailureReason.PROBE_TIMEOUT:
      return 'Reading the video took too long; the file may be damaged.';
    case VideoProcessingFailureReason.CORRUPT_CONTAINER:
      return 'The video could not be read; the file may be damaged or not a real video.';
    case VideoProcessingFailureReason.VIDEO_TOO_LONG_FOR_PLAN:
      return `This video is ${String(wholeSeconds(summary?.durationMs ?? 0))} seconds long; your plan processes videos up to ${String(detail.limitSeconds ?? 0)} seconds. It is stored and can be downloaded, but it was not analysed. Upload a shorter clip or upgrade your plan.`;
    case VideoProcessingFailureReason.VIDEO_DISABLED_FOR_PLAN:
      return 'Your plan does not include video processing. The video is stored and can be downloaded, but it was not analysed.';
    case VideoProcessingFailureReason.SOURCE_UNREADABLE:
      return 'The stored video could not be read back.';
    case VideoProcessingFailureReason.TOOL_UNAVAILABLE:
      return 'Video processing is unavailable on this server (ffmpeg is not installed).';
    case VideoProcessingFailureReason.FILE_NOT_FOUND:
      return 'The file row no longer exists.';
    case VideoProcessingFailureReason.PROCESSING_ERROR:
      return `Video processing failed: ${detail.message ?? 'unknown error'}.`;
  }
}
