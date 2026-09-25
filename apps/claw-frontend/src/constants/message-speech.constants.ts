import { SpeechUnavailableReason } from '@claw/shared-types';

import { ApiErrorCode } from '@/enums/api-error-code.enum';
import { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import type { MessageSpeechMutationSnapshot } from '@/types/message-speech.types';

/** Availability is one read per page, refreshed at most once a minute. */
export const MESSAGE_SPEECH_AVAILABILITY_STALE_MS = 60_000;

/**
 * Synthesis of a long reply outlasts the 30s default HTTP timeout; a cut-off
 * request would still be billed server-side while the user saw a failure.
 */
export const MESSAGE_SPEECH_REQUEST_TIMEOUT_MS = 120_000;

/** Authenticated download path prefix; the fileId is appended. */
export const MESSAGE_SPEECH_DOWNLOAD_PATH_PREFIX = '/api/v1/files/download/';

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

/** The latest synthesis for a message that has never been read aloud. */
export const MESSAGE_SPEECH_EMPTY_SNAPSHOT: Readonly<MessageSpeechMutationSnapshot> = {
  isPending: false,
  isSuccess: false,
  isError: false,
  data: undefined,
  error: null,
};
