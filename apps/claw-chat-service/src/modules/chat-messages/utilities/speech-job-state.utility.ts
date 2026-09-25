import { SpeechJobStatus } from '../../../common/enums';
import type { Prisma } from '../../../generated/prisma';
import {
  SPEECH_JOB_LOCK_TTL_MS,
  SPEECH_STATE_VERSION,
  TTS_FAILED_CODE,
} from '../constants/speech.constants';
import type {
  MessageSpeechStateResponse,
  SpeechJobState,
  StoredSpeechSegment,
} from '../types/speech.types';

/**
 * `metadata.speech` — the durable state of one reply's progressive "Read
 * aloud" (2026-09-25). Version 2 carries a status and one stored file per
 * segment. A version-1 value (one `fileId`, written before segmenting) is read
 * as a READY one-segment state, so an old reading still replays for free.
 * Never audio bytes. Null when absent or malformed.
 */
export function readSpeechJobState(metadata: unknown): SpeechJobState | null {
  if (!isRecord(metadata) || !isRecord(metadata['speech'])) {
    return null;
  }
  const speech = metadata['speech'];
  const contentHash = textOf(speech, 'contentHash');
  if (contentHash === null) {
    return null;
  }
  const legacyFileId = textOf(speech, 'fileId');
  if (speech['version'] !== SPEECH_STATE_VERSION) {
    return legacyFileId === null ? null : legacyState(speech, contentHash, legacyFileId);
  }
  const status = toStatus(speech['status']);
  return status === null
    ? null
    : {
        version: SPEECH_STATE_VERSION,
        status,
        contentHash,
        generation: countOf(speech, 'generation') ?? 1,
        startedAt: textOf(speech, 'startedAt') ?? new Date(0).toISOString(),
        totalSegments: countOf(speech, 'totalSegments') ?? 0,
        characters: countOf(speech, 'characters') ?? 0,
        truncated: speech['truncated'] === true,
        segments: Array.isArray(speech['segments'])
          ? speech['segments'].flatMap((value: unknown) => toStoredSegment(value))
          : [],
        errorCode: textOf(speech, 'errorCode'),
      };
}

/** The message's metadata with `speech` replaced; every other key kept. */
export function withSpeechJobState(
  metadata: Prisma.JsonValue | null,
  state: SpeechJobState,
): Prisma.InputJsonObject {
  const kept: Prisma.JsonObject = isJsonObject(metadata) ? metadata : {};
  return {
    ...kept,
    speech: {
      ...state,
      segments: state.segments.map((segment) => ({ ...segment })),
    },
  };
}

/**
 * A GENERATING state whose job lock has certainly expired: the replica that
 * ran it died (or was redeployed) mid-job. Treated as FAILED on read and
 * resumed on the next POST.
 */
export function isStaleSpeechJob(state: SpeechJobState, now: number): boolean {
  if (state.status !== SpeechJobStatus.GENERATING) {
    return false;
  }
  const started = Date.parse(state.startedAt);
  return Number.isNaN(started) || now - started > SPEECH_JOB_LOCK_TTL_MS;
}

/** What the client is told about the reading of the CURRENT text. */
export function toSpeechStateResponse(
  state: SpeechJobState | null,
  contentHash: string,
  now: number,
): MessageSpeechStateResponse {
  if (state?.contentHash !== contentHash) {
    return {
      status: SpeechJobStatus.NONE,
      segments: [],
      totalSegments: 0,
      truncated: false,
      errorCode: null,
    };
  }
  const stale = isStaleSpeechJob(state, now);
  const status = stale ? staleStatus(state) : state.status;
  return {
    status,
    segments: state.segments.map((segment) => ({
      index: segment.index,
      fileId: segment.fileId,
      mimeType: segment.mimeType,
      characters: segment.characters,
    })),
    totalSegments: state.totalSegments,
    truncated: state.truncated,
    errorCode: stale ? TTS_FAILED_CODE : state.errorCode,
  };
}

/** How a finished job ended: every segment, some, or none. */
export function finalSpeechStatus(totalSegments: number, storedSegments: number): SpeechJobStatus {
  if (storedSegments >= totalSegments && totalSegments > 0) {
    return SpeechJobStatus.READY;
  }
  return storedSegments > 0 ? SpeechJobStatus.PARTIAL : SpeechJobStatus.FAILED;
}

/** `segments` with `stored` in its index position (replacing one with the same index). */
export function withStoredSegment(
  segments: readonly StoredSpeechSegment[],
  stored: StoredSpeechSegment,
): StoredSpeechSegment[] {
  return [...segments.filter((segment) => segment.index !== stored.index), stored].sort(
    (left, right) => left.index - right.index,
  );
}

function staleStatus(state: SpeechJobState): SpeechJobStatus {
  return state.segments.length > 0 ? SpeechJobStatus.PARTIAL : SpeechJobStatus.FAILED;
}

function legacyState(
  speech: Record<string, unknown>,
  contentHash: string,
  fileId: string,
): SpeechJobState {
  const characters = countOf(speech, 'characters') ?? 0;
  return {
    version: SPEECH_STATE_VERSION,
    status: SpeechJobStatus.READY,
    contentHash,
    generation: countOf(speech, 'generation') ?? 1,
    startedAt: new Date(0).toISOString(),
    totalSegments: 1,
    characters,
    truncated: speech['truncated'] === true,
    segments: [
      {
        index: 0,
        fileId,
        mimeType: textOf(speech, 'mimeType') ?? '',
        characters,
        provider: textOf(speech, 'provider') ?? '',
        model: textOf(speech, 'model') ?? '',
      },
    ],
    errorCode: null,
  };
}

function toStoredSegment(value: unknown): StoredSpeechSegment[] {
  if (!isRecord(value)) {
    return [];
  }
  const index = countOf(value, 'index');
  const fileId = textOf(value, 'fileId');
  return index === null || fileId === null
    ? []
    : [
        {
          index,
          fileId,
          mimeType: textOf(value, 'mimeType') ?? '',
          characters: countOf(value, 'characters') ?? 0,
          provider: textOf(value, 'provider') ?? '',
          model: textOf(value, 'model') ?? '',
        },
      ];
}

function toStatus(value: unknown): SpeechJobStatus | null {
  return Object.values(SpeechJobStatus).find((status) => status === value) ?? null;
}

function textOf(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function countOf(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
