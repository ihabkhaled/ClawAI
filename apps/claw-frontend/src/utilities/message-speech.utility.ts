import type { SpeechUnavailableReason } from '@claw/shared-types';
import type { MutationState } from '@tanstack/react-query';

import {
  MESSAGE_SPEECH_ERROR_KEYS,
  MESSAGE_SPEECH_GENERIC_ERROR_KEY,
  MESSAGE_SPEECH_MAX_POLLS,
  MESSAGE_SPEECH_PLAYBACK_ERROR_KEY,
  MESSAGE_SPEECH_POLL_INTERVAL_MS,
  MESSAGE_SPEECH_TIMED_OUT_ERROR_KEY,
  MESSAGE_SPEECH_UNAVAILABLE_KEYS,
} from '@/constants/message-speech.constants';
import { ApiErrorCode } from '@/enums/api-error-code.enum';
import { MessageSpeechJobStatus } from '@/enums/message-speech-job-status.enum';
import { MessageSpeechPlaybackPhase } from '@/enums/message-speech-playback-phase.enum';
import { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type {
  MessageSpeechMutationSnapshot,
  MessageSpeechPhaseInput,
  MessageSpeechPlayerErrorInput,
  MessageSpeechSegment,
  MessageSpeechState,
  MessageSpeechStatusInput,
} from '@/types/message-speech.types';

function isApiErrorCode(code: string | null | undefined): code is ApiErrorCode {
  return Object.values<string>(ApiErrorCode).includes(code ?? '');
}

/** The i18n key for a backend error code; anything unknown reads as the generic failure. */
export function resolveSpeechErrorCodeKey(code: string | null | undefined): string {
  return isApiErrorCode(code)
    ? (MESSAGE_SPEECH_ERROR_KEYS[code] ?? MESSAGE_SPEECH_GENERIC_ERROR_KEY)
    : MESSAGE_SPEECH_GENERIC_ERROR_KEY;
}

/**
 * The i18n key for a failed read-aloud request. A known backend code gets its
 * own message (a wallet refusal is not a provider failure); anything else —
 * a network drop, an unknown code — reads as the generic failure.
 */
export function resolveMessageSpeechErrorKey(error: unknown): string {
  return error instanceof ApiClientError
    ? resolveSpeechErrorCodeKey(error.code)
    : MESSAGE_SPEECH_GENERIC_ERROR_KEY;
}

/** The dimmed button's reason. An unavailable answer without a reason reads as temporary. */
export function resolveSpeechUnavailableKey(reason: SpeechUnavailableReason | null): string {
  return reason === null
    ? 'chat.speech.unavailable.temporarilyUnavailable'
    : MESSAGE_SPEECH_UNAVAILABLE_KEYS[reason];
}

/**
 * What the read-aloud button is showing. LOADING until the first segment is
 * playable; PLAYING (press = stop) once one is; ERROR for a refused start or
 * a job that produced nothing.
 */
export function deriveMessageSpeechStatus(input: MessageSpeechStatusInput): MessageSpeechStatus {
  if (!input.isOpen) {
    return input.isPending ? MessageSpeechStatus.LOADING : MessageSpeechStatus.IDLE;
  }
  if (input.isError || input.state?.status === MessageSpeechJobStatus.FAILED) {
    return MessageSpeechStatus.ERROR;
  }
  if (input.state !== undefined && input.state.segments.length > 0) {
    return MessageSpeechStatus.PLAYING;
  }
  return MessageSpeechStatus.LOADING;
}

/**
 * The poll interval for the job's state: 700 ms while it is GENERATING and
 * the cap (deadline / interval) is not reached, otherwise stop. Never unbounded.
 */
export function nextMessageSpeechPollInterval(
  state: MessageSpeechState | undefined,
  polls: number,
): number | false {
  return state?.status === MessageSpeechJobStatus.GENERATING && polls < MESSAGE_SPEECH_MAX_POLLS
    ? MESSAGE_SPEECH_POLL_INTERVAL_MS
    : false;
}

/** Whether the poll cap ran out while the job still said GENERATING. */
export function isMessageSpeechPollExpired(
  state: MessageSpeechState | undefined,
  polls: number,
): boolean {
  return state?.status === MessageSpeechJobStatus.GENERATING && polls >= MESSAGE_SPEECH_MAX_POLLS;
}

export function findSpeechSegment(
  state: MessageSpeechState | undefined,
  index: number,
): MessageSpeechSegment | undefined {
  return state?.segments.find((segment) => segment.index === index);
}

/**
 * Which segment plays after `index` ends: the next index when it exists, or
 * while the job may still produce it (wait for it — never skip ahead of a
 * segment that is late); once the job is final, the next index that exists
 * (a PARTIAL reading skips the failed part). Null when nothing is left.
 */
export function nextSpeechSegmentIndex(
  state: MessageSpeechState | undefined,
  index: number,
): number | null {
  const following = index + 1;
  if (state === undefined) {
    return null;
  }
  if (findSpeechSegment(state, following) !== undefined) {
    return following;
  }
  if (state.status === MessageSpeechJobStatus.GENERATING) {
    return following < state.totalSegments ? following : null;
  }
  const later = state.segments
    .map((segment) => segment.index)
    .filter((candidate) => candidate > index)
    .sort((left, right) => left - right);
  return later.at(0) ?? null;
}

/** The first index to play: 0, or the first stored one of a final PARTIAL reading. */
export function firstSpeechSegmentIndex(state: MessageSpeechState | undefined): number {
  if (state === undefined || state.status === MessageSpeechJobStatus.GENERATING) {
    return 0;
  }
  const indices = state.segments
    .map((segment) => segment.index)
    .sort((left, right) => left - right);
  return indices.at(0) ?? 0;
}

/** What the player is doing right now. */
export function deriveMessageSpeechPhase(
  input: MessageSpeechPhaseInput,
): MessageSpeechPlaybackPhase {
  const { state } = input;
  if (input.hasPlaybackError || state?.status === MessageSpeechJobStatus.FAILED) {
    return MessageSpeechPlaybackPhase.FAILED;
  }
  if (input.isFinished) {
    return MessageSpeechPlaybackPhase.FINISHED;
  }
  if (input.hasCurrentAudio) {
    return input.isPaused ? MessageSpeechPlaybackPhase.PAUSED : MessageSpeechPlaybackPhase.PLAYING;
  }
  if (input.isPollingExpired) {
    return MessageSpeechPlaybackPhase.FAILED;
  }
  return input.currentIndex === firstSpeechSegmentIndex(state)
    ? MessageSpeechPlaybackPhase.PREPARING
    : MessageSpeechPlaybackPhase.WAITING;
}

/**
 * The failure the player shows, most specific first: a refused start (a
 * wallet refusal reads as billing, not as a voice failure), a job that
 * produced nothing (its own code), a job still GENERATING past the poll cap,
 * then audio that could not be loaded. A PARTIAL reading is not an error —
 * the player shows its own note.
 */
export function resolveSpeechPlayerErrorKey(input: MessageSpeechPlayerErrorInput): string | null {
  if (input.startError !== null) {
    return resolveMessageSpeechErrorKey(input.startError);
  }
  if (input.state?.status === MessageSpeechJobStatus.FAILED) {
    return resolveSpeechErrorCodeKey(input.state.errorCode);
  }
  if (input.isPollingExpired) {
    return MESSAGE_SPEECH_TIMED_OUT_ERROR_KEY;
  }
  return input.hasPlaybackError ? MESSAGE_SPEECH_PLAYBACK_ERROR_KEY : null;
}

/** One start mutation's state, reduced to what the button and player read. */
export function toMessageSpeechSnapshot(
  state: Pick<MutationState, 'status' | 'data' | 'error'>,
): MessageSpeechMutationSnapshot {
  return {
    isPending: state.status === 'pending',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    data: state.data,
    error: state.error,
  };
}
