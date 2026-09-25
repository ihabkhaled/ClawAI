import { VideoProcessingFailureReason } from '@claw/shared-types';

import { VideoFrameDelivery } from '../../../common/enums/video-frame-delivery.enum';
import { UNSUPPORTED_VIDEO_NOTE } from '../constants/attachment-delivery.constants';
import { VIDEO_FILE_PLACEHOLDER_PREFIX } from '../constants/media-placeholder.constants';
import {
  VIDEO_BLOCK_AUDIO_NO,
  VIDEO_BLOCK_AUDIO_YES,
  VIDEO_BLOCK_FRAMES_DERIVED,
  VIDEO_BLOCK_FRAMES_NATIVE,
  VIDEO_BLOCK_GUIDANCE,
  VIDEO_BLOCK_HEADER,
  VIDEO_BLOCK_NO_TRANSCRIPT,
  VIDEO_BLOCK_TRANSCRIPT_LABEL,
  VIDEO_BLOCK_UNKNOWN,
  VIDEO_DOCUMENT_HEADER_PREFIX,
  VIDEO_FAILED_DEFAULT_REASON,
  VIDEO_FAILED_NOTE,
  VIDEO_FRAME_IMAGE_LABEL,
  VIDEO_FRAME_OBSERVATION_HEADER,
  VIDEO_FRAMES_TRANSCRIPT_ONLY_NOTE,
  VIDEO_STILL_PROCESSING_NOTE,
} from '../constants/video-delivery.constants';
import {
  DERIVED_OBSERVATIONS_BEGIN,
  DERIVED_OBSERVATIONS_END,
  DERIVED_OBSERVATIONS_HEADER,
} from '../constants/vision-helper.constants';
import type { FileContentResponse } from '../types/context.types';
import type {
  FileMediaSummary,
  VideoContextBlockInput,
  VideoFrameImage,
  VideoFrameObservation,
} from '../types/video-delivery.types';
import { sanitizeObservations } from './vision-helper.utility';

/** 83_000 → `01:23`; 3_723_000 → `1:02:03` — the same clock file-service writes. */
export function formatVideoClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${String(hours)}:${mmss}` : mmss;
}

/**
 * Whether file-service has written this video's timestamped document — the
 * text is real (not the `[Video file: …]` placeholder) and processing did not
 * fail.
 */
export function hasVideoDocument(file: FileContentResponse): boolean {
  const text = file.extractedText?.trim() ?? '';
  return (
    text.length > 0 &&
    !text.startsWith(VIDEO_FILE_PLACEHOLDER_PREFIX) &&
    file.ingestionStatus !== 'FAILED' &&
    (file.extractionError === null || file.extractionError === undefined)
  );
}

/** Processing failed (a terminal answer from file-service). */
export function videoProcessingFailed(file: FileContentResponse): boolean {
  return (
    file.ingestionStatus === 'FAILED' ||
    (file.extractionError !== null && file.extractionError !== undefined)
  );
}

/** file-service has not finished: the placeholder is still there, or the row is PENDING/PROCESSING. */
export function videoInFlight(file: FileContentResponse): boolean {
  const text = file.extractedText?.trim() ?? '';
  return (
    text.startsWith(VIDEO_FILE_PLACEHOLDER_PREFIX) ||
    file.ingestionStatus === 'PENDING' ||
    file.ingestionStatus === 'PROCESSING'
  );
}

/** The plan refused this video; native delivery must not bypass it (ADR-122). */
export function isVideoPlanRefusal(media: FileMediaSummary | undefined): boolean {
  return (
    media?.failureReason === VideoProcessingFailureReason.VIDEO_TOO_LONG_FOR_PLAN ||
    media?.failureReason === VideoProcessingFailureReason.VIDEO_DISABLED_FOR_PLAN
  );
}

/** The owner stopped this video's processing (pack §72): never native, reason named apart. */
export function isVideoProcessingCancelled(media: FileMediaSummary | undefined): boolean {
  return media?.failureReason === VideoProcessingFailureReason.PROCESSING_CANCELLED;
}

/** The document minus file-service's own header line, which the block restates from `media`. */
export function videoTranscriptBody(document: string): string {
  const lines = document.trim().split(/\r?\n/);
  const body = lines[0]?.startsWith(VIDEO_DOCUMENT_HEADER_PREFIX) === true ? lines.slice(1) : lines;
  return body.join('\n').trim();
}

/** `VIDEO: clip.mp4 (duration 01:23, 1280x720, audio: yes)`. */
export function formatVideoHeader(filename: string, media: FileMediaSummary | undefined): string {
  const duration =
    media?.durationMs === null || media?.durationMs === undefined
      ? VIDEO_BLOCK_UNKNOWN
      : formatVideoClock(media.durationMs);
  const resolution =
    media?.width === null ||
    media?.width === undefined ||
    media.height === null ||
    media.height === undefined
      ? `resolution ${VIDEO_BLOCK_UNKNOWN}`
      : `${String(media.width)}x${String(media.height)}`;
  const audio = audioLabel(media?.hasAudio ?? null);
  return VIDEO_BLOCK_HEADER.replace('{FILENAME}', filename.replaceAll(/[\r\n]/g, ' '))
    .replace('{DURATION}', duration)
    .replace('{RESOLUTION}', resolution)
    .replace('{AUDIO}', audio);
}

/**
 * The framed, temporal block one lane receives for one video (multimodal
 * batch 8): header, timestamped transcript, then what the lane got of the
 * frames — native images (listed by time), the helper's timestamped
 * observations, or the honest transcript-only note. Never one unattributed blob.
 */
export function formatVideoContextBlock(input: VideoContextBlockInput): string {
  const transcript = videoTranscriptBody(input.document);
  const lines = [
    formatVideoHeader(input.filename, input.media),
    VIDEO_BLOCK_TRANSCRIPT_LABEL,
    transcript.length > 0 ? transcript : VIDEO_BLOCK_NO_TRANSCRIPT,
    ...frameLines(input),
    VIDEO_BLOCK_GUIDANCE,
  ];
  return lines.join('\n');
}

function frameLines(input: VideoContextBlockInput): string[] {
  const set = input.frameSet;
  if (set?.frameDelivery === VideoFrameDelivery.NATIVE_IMAGES && set.frames.length > 0) {
    return [VIDEO_BLOCK_FRAMES_NATIVE.replace('{TIMES}', timesOf(set.frames))];
  }
  return set?.frameDelivery === VideoFrameDelivery.HELPER_OBSERVATIONS &&
    set.observations.length > 0
    ? [
        VIDEO_BLOCK_FRAMES_DERIVED.replace('{TIMES}', timesOf(set.observations)),
        ...set.observations.map(formatFrameObservation),
      ]
    : [VIDEO_FRAMES_TRANSCRIPT_ONLY_NOTE];
}

/** One described frame, labelled with its timestamp and the helper that saw it. */
export function formatFrameObservation(observation: VideoFrameObservation): string {
  return [
    VIDEO_FRAME_OBSERVATION_HEADER.replace('{TIME}', formatVideoClock(observation.timestampMs)),
    DERIVED_OBSERVATIONS_HEADER.replace('{PROVIDER}', observation.helperProvider).replace(
      '{MODEL}',
      observation.helperModel,
    ),
    DERIVED_OBSERVATIONS_BEGIN,
    sanitizeObservations(observation.text),
    DERIVED_OBSERVATIONS_END,
  ].join('\n');
}

/** The text part that precedes one native frame image in the user turn. */
export function videoFrameImageLabel(filename: string, timestampMs: number): string {
  return VIDEO_FRAME_IMAGE_LABEL.replace('{FILENAME}', filename).replace(
    '{TIME}',
    formatVideoClock(timestampMs),
  );
}

/**
 * What a lane is told for a video with no document: failed (with file-service's
 * reason, plan limits included), still processing (the placeholder, or a
 * PENDING/PROCESSING row), or — a row with no text and no status at all — the
 * plain statement that nothing of it could be read.
 */
export function describeUnprocessedVideo(file: FileContentResponse): string {
  if (videoProcessingFailed(file)) {
    const reason = file.extractionError?.trim() ?? '';
    return VIDEO_FAILED_NOTE.replace('{FILENAME}', file.filename).replace(
      '{REASON}',
      reason.length > 0 ? reason : VIDEO_FAILED_DEFAULT_REASON,
    );
  }
  return videoInFlight(file)
    ? VIDEO_STILL_PROCESSING_NOTE.replace('{FILENAME}', file.filename)
    : `[Video file "${file.filename}" (${file.mimeType}) — video has no text to extract. ${UNSUPPORTED_VIDEO_NOTE}]`;
}

/** The key one frame's helper description is cached and billed under. */
export function videoFrameKey(fileId: string, timestampMs: number): string {
  return `${fileId}@${String(timestampMs)}`;
}

/** A frame as the image the vision helper is shown. */
export function videoFrameAsImageFile(
  file: Pick<FileContentResponse, 'id' | 'filename'>,
  frame: VideoFrameImage,
): FileContentResponse {
  return {
    id: videoFrameKey(file.id, frame.timestampMs),
    filename: `${file.filename} (frame at ${formatVideoClock(frame.timestampMs)})`,
    mimeType: frame.mimeType,
    content: frame.base64,
    extractedText: null,
    ingestionStatus: 'COMPLETED',
    extractionError: null,
  };
}

function audioLabel(hasAudio: boolean | null): string {
  if (hasAudio === null) {
    return VIDEO_BLOCK_UNKNOWN;
  }
  return hasAudio ? VIDEO_BLOCK_AUDIO_YES : VIDEO_BLOCK_AUDIO_NO;
}

function timesOf(items: readonly { timestampMs: number }[]): string {
  return items.map((item) => formatVideoClock(item.timestampMs)).join(', ');
}
