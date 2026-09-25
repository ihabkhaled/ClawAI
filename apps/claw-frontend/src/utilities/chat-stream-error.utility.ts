import {
  CHAT_STREAM_ERROR_KEY_BY_CODE,
  CHAT_STREAM_ERROR_MESSAGE_KEYS,
  CHAT_STREAM_FALLBACK_ERROR_KEY,
  STORED_ERROR_PREFIX,
} from '@/constants/chat-stream-error.constants';
import type { StreamEvent, TranslateFunction } from '@/types';

export function resolveChatStreamError(event: StreamEvent, translate: TranslateFunction): string {
  if (event.messageKey !== undefined && CHAT_STREAM_ERROR_MESSAGE_KEYS.has(event.messageKey)) {
    return translate(event.messageKey);
  }

  const mappedKey =
    event.code === undefined ? undefined : CHAT_STREAM_ERROR_KEY_BY_CODE.get(event.code);
  return translate(mappedKey ?? CHAT_STREAM_FALLBACK_ERROR_KEY);
}

function allowListedKey(messageKey: unknown, code: unknown): string | undefined {
  if (typeof messageKey === 'string' && CHAT_STREAM_ERROR_MESSAGE_KEYS.has(messageKey)) {
    return messageKey;
  }
  return typeof code === 'string' ? CHAT_STREAM_ERROR_KEY_BY_CODE.get(code) : undefined;
}

/**
 * The translated text for a STORED error reply, or null to show its content.
 *
 * chat-service stores a failed turn as an assistant message whose content is
 * an English sentence, with `errorCode` / `errorMessageKey` in metadata. The
 * live stream event was already translated; this makes the same reply read in
 * the user's language after a reload. Only allow-listed keys are honoured, so
 * metadata can never pick an arbitrary translation.
 */
export function resolveStoredErrorMessage(
  metadata: Record<string, unknown> | null,
  translate: TranslateFunction,
): string | null {
  if (metadata?.['error'] !== true) {
    return null;
  }
  const key = allowListedKey(metadata['errorMessageKey'], metadata['errorCode']);
  return key === undefined ? null : `${STORED_ERROR_PREFIX}${translate(key)}`;
}
