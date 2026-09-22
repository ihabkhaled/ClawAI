import { MEDIA_RECORDING_UNSUPPORTED_KEY } from '@/constants/media-recording-copy.constants';
import {
  MEDIA_RECORDING_AUDIO_FILENAME_STEM,
  MEDIA_RECORDING_FALLBACK_AUDIO_MIME,
  MEDIA_RECORDING_FALLBACK_EXTENSION,
  MEDIA_RECORDING_FALLBACK_VIDEO_MIME,
  MEDIA_RECORDING_MAX_MS,
  MEDIA_RECORDING_VIDEO_FILENAME_STEM,
} from '@/constants/media-recording.constants';
import { MediaRecordingKind } from '@/enums/media-recording-kind.enum';

// Subtypes whose sensible file extension is not the subtype itself.
const EXTENSION_OVERRIDES: Readonly<Record<string, string>> = {
  mpeg: 'mp3',
  'x-matroska': 'mkv',
  quicktime: 'mov',
  'x-m4a': 'm4a',
  'x-wav': 'wav',
};

/**
 * Strip codec parameters from a recorder mimeType.
 *
 * MediaRecorder reports `audio/webm;codecs=opus`, but file-service matches the
 * DECLARED mime against an exact allowlist (AUDIO_MIME_DETECTION_ALIASES), and
 * `audio/webm;codecs=opus` is not a key in it. Uploading the raw string is a
 * 400 every time; uploading the base type is the same bytes, accepted.
 */
export function normalizeRecordingMimeType(
  mimeType: string | undefined,
  kind: MediaRecordingKind,
): string {
  const base = (mimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (base.length > 0) {
    return base;
  }
  return kind === MediaRecordingKind.Video
    ? MEDIA_RECORDING_FALLBACK_VIDEO_MIME
    : MEDIA_RECORDING_FALLBACK_AUDIO_MIME;
}

/** Extension for a normalized mimeType, e.g. `audio/webm` -> `webm`. */
export function extensionForRecordingMimeType(normalizedMimeType: string): string {
  const subtype = normalizedMimeType.split('/')[1];
  if (subtype === undefined || subtype.length === 0) {
    return MEDIA_RECORDING_FALLBACK_EXTENSION;
  }
  return EXTENSION_OVERRIDES[subtype] ?? subtype;
}

/**
 * `voice-note-2026-09-22T10-31-05-123.webm`.
 */
export function buildRecordingFilename(
  kind: MediaRecordingKind,
  normalizedMimeType: string,
  now: Date = new Date(),
): string {
  const stem =
    kind === MediaRecordingKind.Video
      ? MEDIA_RECORDING_VIDEO_FILENAME_STEM
      : MEDIA_RECORDING_AUDIO_FILENAME_STEM;
  // ISO with ':' and '.' flattened and the trailing 'Z' dropped: colons are
  // illegal in a Windows filename and awkward in a URL.
  const stamp = now.toISOString().replaceAll(':', '-').replaceAll('.', '-').slice(0, -1);
  return `${stem}-${stamp}.${extensionForRecordingMimeType(normalizedMimeType)}`;
}

/** `m:ss` readout for the live elapsed timer. */
export function formatRecordingElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Why a recorder trigger is blocked, as a translation key, or null when it is
 * not. A helper rather than a ternary chain in the component: nested ternaries
 * are a lint error here, and a TSX file holds only its component.
 */
export function resolveRecorderBlockedKey(
  isSupported: boolean,
  canSend: boolean,
  modelBlockedKey: string,
): string | null {
  if (!isSupported) {
    return MEDIA_RECORDING_UNSUPPORTED_KEY;
  }
  if (!canSend) {
    return modelBlockedKey;
  }
  return null;
}

/**
 * The recording cap, in whole minutes, for the consent dialog copy.
 *
 * Derived from `MEDIA_RECORDING_MAX_MS` rather than written into the 13
 * locale files: a change to the cap must not leave thirteen translations
 * quietly promising the old number.
 */
export function resolveRecordingMaxMinutes(maxMs: number = MEDIA_RECORDING_MAX_MS): number {
  return Math.max(1, Math.round(maxMs / 60_000));
}
