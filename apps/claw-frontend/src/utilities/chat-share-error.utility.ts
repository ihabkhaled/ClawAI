import { CHAT_SHARE_ERROR_KEYS } from '@/constants/chat-share-error.constants';
import type { ChatShareErrorCode } from '@/enums/chat-share-error-code.enum';

/**
 * The i18n key that best explains a failed share operation.
 *
 * Returns `fallbackKey` for anything unrecognised — a network drop, a 500, or a
 * code added to the backend after this build. Guessing at an unknown code would
 * be worse than the generic message: telling someone their chat is empty when it
 * is not sends them looking for the wrong problem.
 *
 * Only the `code` is consulted. `error.message` from a BusinessException is the
 * untranslated key string, so showing it directly puts `chat.share.errors.*` in
 * front of the user.
 */
export function resolveChatShareErrorKey(error: unknown, fallbackKey: string): string {
  if (error === null || typeof error !== 'object' || !('code' in error)) {
    return fallbackKey;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string') {
    return fallbackKey;
  }
  return CHAT_SHARE_ERROR_KEYS[code as ChatShareErrorCode] ?? fallbackKey;
}
