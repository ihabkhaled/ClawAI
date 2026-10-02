export const CHAT_STREAM_FALLBACK_ERROR_KEY = 'chat.allProvidersFailed';

export const CHAT_STREAM_ERROR_KEY_BY_CODE: ReadonlyMap<string, string> = new Map([
  ['VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED', 'chat.errors.videoAttachmentProviderUnsupported'],
  ['VIDEO_ATTACHMENT_LOCAL_MODEL_UNAVAILABLE', 'chat.errors.videoAttachmentLocalModelUnavailable'],
  // The provider's own account is out of credit (OpenRouter 402). chat-service
  // never forwards the provider's text - it carried a key-management URL.
  ['PROVIDER_CREDIT_EXHAUSTED', 'chat.errors.providerCreditExhausted'],
  // A model its provider retired (404 model_not_found): another model can answer.
  ['PROVIDER_MODEL_UNAVAILABLE', 'chat.errors.providerModelUnavailable'],
  // Credit refusals (402). They arrive over SSE because the send was accepted,
  // so without these a spent allowance read "All providers failed".
  ['PAYG_CREDIT_EXHAUSTED', 'billing.errors.PAYG_CREDIT_EXHAUSTED'],
  ['PAYG_PROMPT_TOO_EXPENSIVE', 'billing.errors.PAYG_PROMPT_TOO_EXPENSIVE'],
  ['PAYG_MODEL_UNPRICED', 'billing.errors.PAYG_MODEL_UNPRICED'],
  ['PAYG_PRICING_UNAVAILABLE', 'billing.errors.PAYG_PRICING_UNAVAILABLE'],
  ['PAYG_FREE_ALLOWANCE_EXHAUSTED', 'billing.errors.PAYG_FREE_ALLOWANCE_EXHAUSTED'],
  // The picked model AND its substitutes failed: the bubble adds the retry buttons.
  ['PICKED_MODEL_FAILED', 'pickedModel.failedMessage'],
]);

// Prefix chat-service writes before a stored error reply's text.
export const STORED_ERROR_PREFIX = '⚠️ ';

// Keys chat-service sends as `messageKey` with a SHARED code (the 429 transient
// code, the generic request-failed code), so they cannot be mapped by code
// (ADR-125).
const MESSAGE_KEY_ONLY_ERRORS: readonly string[] = [
  'chat.errors.providerRateLimited',
  'chat.errors.providerOutputLimit',
];

export const CHAT_STREAM_ERROR_MESSAGE_KEYS: ReadonlySet<string> = new Set([
  ...CHAT_STREAM_ERROR_KEY_BY_CODE.values(),
  ...MESSAGE_KEY_ONLY_ERRORS,
]);
