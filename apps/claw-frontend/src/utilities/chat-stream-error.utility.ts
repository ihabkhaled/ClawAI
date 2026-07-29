import {
  CHAT_STREAM_ERROR_KEY_BY_CODE,
  CHAT_STREAM_ERROR_MESSAGE_KEYS,
  CHAT_STREAM_FALLBACK_ERROR_KEY,
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
