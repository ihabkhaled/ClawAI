import { SpeechUnavailableReason } from '@claw/shared-types';

import { ApiErrorCode } from '@/enums/api-error-code.enum';
import { MessageSpeechPlaybackPhase } from '@/enums/message-speech-playback-phase.enum';
import { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import type { MessageSpeechMutationSnapshot } from '@/types/message-speech.types';

/** Availability is one read per page, refreshed at most once a minute. */
export const MESSAGE_SPEECH_AVAILABILITY_STALE_MS = 60_000;

/**
 * POST and GET only read or start the job (the synthesis runs in the
 * background since 2026-09-25), so neither needs more than a short timeout.
 */
export const MESSAGE_SPEECH_REQUEST_TIMEOUT_MS = 15_000;

/** A segment's audio, relative to the API base; the fileId is appended. */
export const MESSAGE_SPEECH_FILE_PATH_PREFIX = '/files/download/';

/** How often the player asks for the job's state while it is GENERATING. */
export const MESSAGE_SPEECH_POLL_INTERVAL_MS = 700;

/** The job's own backend deadline (3 minutes); polling never outlives it. */
export const MESSAGE_SPEECH_POLL_DEADLINE_MS = 180_000;

/** The hard cap on polls for one reading: deadline / interval, rounded up. */
export const MESSAGE_SPEECH_MAX_POLLS = Math.ceil(
  MESSAGE_SPEECH_POLL_DEADLINE_MS / MESSAGE_SPEECH_POLL_INTERVAL_MS,
);

/** Shown when the job is still GENERATING after the polling cap. */
export const MESSAGE_SPEECH_TIMED_OUT_ERROR_KEY = 'chat.speech.errors.timedOut';

/** Shown for any failure the backend did not name with a known code. */
export const MESSAGE_SPEECH_GENERIC_ERROR_KEY = 'chat.speech.errors.generic';

/** Shown when the audio file itself could not be fetched. */
export const MESSAGE_SPEECH_PLAYBACK_ERROR_KEY = 'chat.speech.errors.playback';

/**
 * Backend error code → what the user reads. The PAYG codes reuse the billing
 * copy on purpose: the same wallet refusal reads the same everywhere, and
 * PAYG_PRICING_UNAVAILABLE stays "our outage", never "your balance".
 */
export const MESSAGE_SPEECH_ERROR_KEYS: Readonly<Partial<Record<ApiErrorCode, string>>> = {
  [ApiErrorCode.PLAN_FEATURE_DISABLED]: 'chat.speech.errors.planDisabled',
  [ApiErrorCode.ENTITY_NOT_FOUND]: 'chat.speech.errors.notFound',
  [ApiErrorCode.TTS_NOTHING_TO_READ]: 'chat.speech.errors.nothingToRead',
  [ApiErrorCode.TTS_UNAVAILABLE]: 'chat.speech.errors.unavailable',
  [ApiErrorCode.TTS_FAILED]: 'chat.speech.errors.failed',
  [ApiErrorCode.TTS_CANCEL_PENDING]: 'chat.speech.errors.cancelPending',
  [ApiErrorCode.PAYG_CREDIT_EXHAUSTED]: 'billing.errors.PAYG_CREDIT_EXHAUSTED',
  [ApiErrorCode.PAYG_PROMPT_TOO_EXPENSIVE]: 'billing.errors.PAYG_PROMPT_TOO_EXPENSIVE',
  [ApiErrorCode.PAYG_MODEL_UNPRICED]: 'billing.errors.PAYG_MODEL_UNPRICED',
  [ApiErrorCode.PAYG_PRICING_UNAVAILABLE]: 'billing.errors.PAYG_PRICING_UNAVAILABLE',
};

/** Why the dimmed button cannot run, in the user's words. One per reason. */
export const MESSAGE_SPEECH_UNAVAILABLE_KEYS: Readonly<Record<SpeechUnavailableReason, string>> = {
  [SpeechUnavailableReason.PLAN_DISABLED]: 'chat.speech.unavailable.planDisabled',
  [SpeechUnavailableReason.NO_VOICE_CONFIGURED]: 'chat.speech.unavailable.noVoice',
  [SpeechUnavailableReason.TEMPORARILY_UNAVAILABLE]:
    'chat.speech.unavailable.temporarilyUnavailable',
};

/** The button's label for each state (when read aloud is available). */
export const MESSAGE_SPEECH_LABEL_KEYS: Readonly<Record<MessageSpeechStatus, string>> = {
  [MessageSpeechStatus.IDLE]: 'chat.speech.action',
  [MessageSpeechStatus.LOADING]: 'chat.speech.loading',
  [MessageSpeechStatus.PLAYING]: 'chat.speech.stop',
  [MessageSpeechStatus.ERROR]: 'chat.speech.action',
};

/** What the player's live status line says in each phase. */
export const MESSAGE_SPEECH_PHASE_KEYS: Readonly<Record<MessageSpeechPlaybackPhase, string>> = {
  [MessageSpeechPlaybackPhase.PREPARING]: 'chat.speech.loading',
  [MessageSpeechPlaybackPhase.PLAYING]: 'chat.speech.progress',
  [MessageSpeechPlaybackPhase.PAUSED]: 'chat.speech.paused',
  [MessageSpeechPlaybackPhase.WAITING]: 'chat.speech.waitingNext',
  [MessageSpeechPlaybackPhase.FINISHED]: 'chat.speech.finished',
  [MessageSpeechPlaybackPhase.FAILED]: 'chat.speech.errors.generic',
  [MessageSpeechPlaybackPhase.CANCELLED]: 'chat.speech.cancelled',
};

/** The latest synthesis for a message that has never been read aloud. */
export const MESSAGE_SPEECH_EMPTY_SNAPSHOT: Readonly<MessageSpeechMutationSnapshot> = {
  isPending: false,
  isSuccess: false,
  isError: false,
  data: undefined,
  error: null,
};
