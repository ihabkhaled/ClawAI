import type { SpeechUnavailableReason } from '@claw/shared-types';
import type { MutationState } from '@tanstack/react-query';

import {
  MESSAGE_SPEECH_DOWNLOAD_PATH_PREFIX,
  MESSAGE_SPEECH_ERROR_KEYS,
  MESSAGE_SPEECH_GENERIC_ERROR_KEY,
  MESSAGE_SPEECH_UNAVAILABLE_KEYS,
} from '@/constants/message-speech.constants';
import { ApiErrorCode } from '@/enums/api-error-code.enum';
import { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type {
  MessageSpeechMutationSnapshot,
  MessageSpeechStatusInput,
  SynthesizedSpeech,
} from '@/types/message-speech.types';

function isApiErrorCode(code: string | undefined): code is ApiErrorCode {
  return Object.values<string>(ApiErrorCode).includes(code ?? '');
}

/**
 * The i18n key for a failed read-aloud request. A known backend code gets its
 * own message (a wallet refusal is not a provider failure); anything else —
 * a network drop, an unknown code — reads as the generic failure.
 */
export function resolveMessageSpeechErrorKey(error: unknown): string {
  if (!(error instanceof ApiClientError) || !isApiErrorCode(error.code)) {
    return MESSAGE_SPEECH_GENERIC_ERROR_KEY;
  }
  return MESSAGE_SPEECH_ERROR_KEYS[error.code] ?? MESSAGE_SPEECH_GENERIC_ERROR_KEY;
}

/** The dimmed button's reason. An unavailable answer without a reason reads as temporary. */
export function resolveSpeechUnavailableKey(reason: SpeechUnavailableReason | null): string {
  return reason === null
    ? 'chat.speech.unavailable.temporarilyUnavailable'
    : MESSAGE_SPEECH_UNAVAILABLE_KEYS[reason];
}

/** What the read-aloud button is showing right now. */
export function deriveMessageSpeechStatus(input: MessageSpeechStatusInput): MessageSpeechStatus {
  if (input.isPending) {
    return MessageSpeechStatus.LOADING;
  }
  if (input.isOpen && input.isError) {
    return MessageSpeechStatus.ERROR;
  }
  if (input.isOpen && input.isSuccess) {
    return MessageSpeechStatus.PLAYING;
  }
  return MessageSpeechStatus.IDLE;
}

/** Narrows a mutation's `data` (typed unknown by useMutationState) to the synthesis result. */
export function isSynthesizedSpeech(value: unknown): value is SynthesizedSpeech {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'fileId' in value &&
    typeof value.fileId === 'string' &&
    'filename' in value &&
    typeof value.filename === 'string' &&
    'mimeType' in value &&
    typeof value.mimeType === 'string' &&
    'truncated' in value &&
    typeof value.truncated === 'boolean'
  );
}

/** The authenticated download path for a speech file. */
export function buildSpeechDownloadPath(fileId: string): string {
  return `${MESSAGE_SPEECH_DOWNLOAD_PATH_PREFIX}${fileId}`;
}

/** One synthesize mutation's state, reduced to what the button and player read. */
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
