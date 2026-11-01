import {
  AUDIO_DOWNLOAD_FILENAME_BY_MIME,
  AUDIO_DOWNLOAD_FILENAME_FALLBACK,
  AUDIO_STATUS_LABEL_KEYS,
  AUDIO_STATUS_PREPARING_KEY,
} from '@/constants/audio-generation.constants';
import { AudioGenerationStatus } from '@/enums/audio-generation-status.enum';
import { MediaGenerationKind } from '@/enums/media-generation-kind.enum';
import type {
  AudioGeneration,
  AudioGenerationRow,
  MediaGenerationView,
} from '@/types/media-generation.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The media one Compare lane's model made: the lane result first, else its stored message. */
export function readLaneMediaGenerations(lane: {
  mediaGenerations?: unknown;
  message?: { metadata?: unknown };
}): MediaGenerationView[] {
  const stored = lane.message?.metadata;
  const fromMessage = isRecord(stored) ? readMediaGenerations(stored) : [];
  return lane.mediaGenerations === undefined
    ? fromMessage
    : readMediaGenerations({ mediaGenerations: lane.mediaGenerations });
}

/**
 * The media a chat model made for an assistant message (`metadata.mediaGenerations`), read
 * defensively from stored metadata. Anything malformed is dropped, never thrown.
 */
export function readMediaGenerations(
  metadata: Record<string, unknown> | null,
): MediaGenerationView[] {
  const raw = metadata?.['mediaGenerations'];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((entry): MediaGenerationView[] => {
    if (!isRecord(entry)) {
      return [];
    }
    const kind = Object.values(MediaGenerationKind).find(
      (candidate) => candidate === entry['kind'],
    );
    const id = entry['id'];
    if (kind === undefined || typeof id !== 'string' || id.length === 0) {
      return [];
    }
    const prompt = entry['prompt'];
    return [{ kind, id, prompt: typeof prompt === 'string' ? prompt : '' }];
  });
}

export function isInProgressAudioStatus(status: AudioGenerationStatus): boolean {
  return status === AudioGenerationStatus.QUEUED || status === AudioGenerationStatus.RUNNING;
}

/** The translation key for the audio card's status line (a KEY: the card calls `t()`). */
export function getAudioStatusLabelKey(status?: AudioGenerationStatus): string {
  return status === undefined ? AUDIO_STATUS_PREPARING_KEY : AUDIO_STATUS_LABEL_KEYS[status];
}

/** The file name the Download link offers, matching the audio format. */
export function getAudioDownloadFilename(mimeType: string | undefined): string {
  return (
    AUDIO_DOWNLOAD_FILENAME_BY_MIME.get(
      (mimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? '',
    ) ?? AUDIO_DOWNLOAD_FILENAME_FALLBACK
  );
}

/** `m:ss` for a length in seconds; null when the provider did not report one. */
export function formatAudioDuration(seconds: number | undefined): string | null {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  const whole = Math.round(seconds);
  return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, '0')}`;
}

/** The row to show: the head of the retry chain when the server resolved one. */
export function toDisplayedAudioRow(generation: AudioGeneration): AudioGenerationRow {
  const { latest, ...row } = generation;
  return latest ?? row;
}
