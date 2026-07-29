export const CHAT_STREAM_FALLBACK_ERROR_KEY = 'chat.allProvidersFailed';

export const CHAT_STREAM_ERROR_KEY_BY_CODE: ReadonlyMap<string, string> = new Map([
  ['VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED', 'chat.errors.videoAttachmentProviderUnsupported'],
  ['VIDEO_ATTACHMENT_LOCAL_MODEL_UNAVAILABLE', 'chat.errors.videoAttachmentLocalModelUnavailable'],
]);

export const CHAT_STREAM_ERROR_MESSAGE_KEYS: ReadonlySet<string> = new Set(
  CHAT_STREAM_ERROR_KEY_BY_CODE.values(),
);
