import { ChatShareErrorCode } from '@/enums/chat-share-error-code.enum';

/**
 * Maps a backend share error code to the i18n key that explains it.
 *
 * Without this, `showToast.apiError` falls through to `error.message`, which for
 * a `BusinessException` is the raw key string — the user is shown the literal
 * text `chat.share.errors.EMPTY_THREAD`. The backend enum's own comment says the
 * frontend maps these; this is that map.
 */
export const CHAT_SHARE_ERROR_KEYS: Readonly<Record<ChatShareErrorCode, string>> = {
  [ChatShareErrorCode.EmptyThread]: 'chatShare.errors.emptyThread',
  [ChatShareErrorCode.ShareNotFound]: 'chatShare.errors.shareNotFound',
  [ChatShareErrorCode.InvalidShareId]: 'chatShare.errors.invalidShareId',
};
