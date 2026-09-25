export const CHAT_STREAM_FALLBACK_ERROR_KEY = 'chat.allProvidersFailed';

export const CHAT_STREAM_ERROR_KEY_BY_CODE: ReadonlyMap<string, string> = new Map([
  ['VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED', 'chat.errors.videoAttachmentProviderUnsupported'],
  ['VIDEO_ATTACHMENT_LOCAL_MODEL_UNAVAILABLE', 'chat.errors.videoAttachmentLocalModelUnavailable'],
  // The provider's own account is out of credit (OpenRouter 402). chat-service
  // never forwards the provider's text - it carried a key-management URL.
  ['PROVIDER_CREDIT_EXHAUSTED', 'chat.errors.providerCreditExhausted'],
]);

// Prefix chat-service writes before a stored error reply's text.
export const STORED_ERROR_PREFIX = '⚠️ ';

export const CHAT_STREAM_ERROR_MESSAGE_KEYS: ReadonlySet<string> = new Set(
  CHAT_STREAM_ERROR_KEY_BY_CODE.values(),
);
