import { FileIngestionStatus } from '../../../generated/prisma';
import { OWNER_PLACEHOLDER_PROCESSING_CEILING_MS } from '../constants/effective-ingestion.constants';
import { AUDIO_PLACEHOLDER_PREFIX } from '../constants/transcription.constants';
import { VIDEO_PLACEHOLDER_PREFIX } from '../constants/video-processing.constants';
import {
  type EffectiveIngestionOptions,
  type EffectiveIngestionRow,
} from '../types/effective-ingestion.types';

/** A video row whose timestamped document has not landed yet. */
export function isVideoPlaceholderRow(row: EffectiveIngestionRow): boolean {
  return (
    row.mimeType.startsWith('video/') &&
    (row.extractedText ?? '').startsWith(VIDEO_PLACEHOLDER_PREFIX)
  );
}

/** An audio row whose transcript has not landed yet. */
export function isAudioPlaceholderRow(row: EffectiveIngestionRow): boolean {
  return (
    row.mimeType.startsWith('audio/') &&
    (row.extractedText ?? '').startsWith(AUDIO_PLACEHOLDER_PREFIX)
  );
}

/**
 * The ONE mapping from a persisted row to the status every reader is told
 * (rule 42 items 12 and 15). Audio and video rows are written `COMPLETED` the
 * instant they are stored, with a `[Audio file: …]` / `[Video file: …]`
 * placeholder, because the row is coherent and downloadable; the transcript /
 * timestamped document lands later. Until it does the row is reported
 * `PROCESSING` — or `FAILED` once `extractionError` says why — WITHOUT ever
 * touching the persisted column.
 *
 * Used by the internal readiness check (`getIngestionState`) and by the
 * owner-facing list and detail responses, so the composer chip and
 * chat-service's wait can never disagree. Found live 2026-09-25: the list
 * returned the persisted COMPLETED and a video chip read "Ready" while its job
 * was still running.
 */
export function resolveEffectiveIngestionStatus(
  row: EffectiveIngestionRow,
  options: EffectiveIngestionOptions = {},
): FileIngestionStatus {
  if (row.ingestionStatus !== FileIngestionStatus.COMPLETED) {
    return row.ingestionStatus;
  }
  if (!isAudioPlaceholderRow(row) && !isVideoPlaceholderRow(row)) {
    return row.ingestionStatus;
  }
  if (row.extractionError !== null) {
    return FileIngestionStatus.FAILED;
  }
  const { ceilingMs, now = Date.now() } = options;
  const pastCeiling = ceilingMs !== undefined && now - row.updatedAt.getTime() > ceilingMs;
  return pastCeiling ? row.ingestionStatus : FileIngestionStatus.PROCESSING;
}

/** A row as its owner is shown it: same row, effective status. */
export function withEffectiveIngestionStatus<T extends EffectiveIngestionRow>(
  row: T,
  options: EffectiveIngestionOptions = {},
): T {
  return { ...row, ingestionStatus: resolveEffectiveIngestionStatus(row, options) };
}

/**
 * The owner-facing view (file list, `GET /files/:id`): the effective status,
 * bounded by OWNER_PLACEHOLDER_PROCESSING_CEILING_MS so a lost job never pins
 * the list's poll open.
 */
export function withOwnerFacingIngestionStatus<T extends EffectiveIngestionRow>(
  row: T,
  now: number = Date.now(),
): T {
  return withEffectiveIngestionStatus(row, {
    ceilingMs: OWNER_PLACEHOLDER_PROCESSING_CEILING_MS,
    now,
  });
}
