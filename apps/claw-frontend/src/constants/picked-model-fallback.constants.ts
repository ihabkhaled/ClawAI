/** The code chat-service stores when the picked model and its substitutes all failed. */
export const PICKED_MODEL_FAILED_CODE = 'PICKED_MODEL_FAILED';

/** How many one-click retry models the recovery offers. */
export const PICKED_MODEL_MAX_SUGGESTIONS = 3;

/**
 * Stored error codes that, on a message the user answered with a picked model,
 * also get the recovery buttons (a provider failure another model can fix).
 * Credit, plan and quota refusals are NOT here: another model cannot fix them,
 * and they show their own upgrade notice.
 */
export const PICKED_MODEL_RECOVERABLE_ERROR_CODES: ReadonlySet<string> = new Set([
  PICKED_MODEL_FAILED_CODE,
  'PROVIDER_CREDIT_EXHAUSTED',
  'LLM_EXECUTION_FAILED',
]);

/**
 * Model ids that are not text-chat models (speech, video, image, embeddings,
 * live audio, moderation, computer-use, deep research). The catalog still lists
 * some as chat models, and a suggested retry must be able to answer a chat turn.
 * Mirrors routing-service `PICKED_MODEL_NON_CHAT_ID_PATTERN`.
 */
export const PICKED_MODEL_NON_CHAT_ID_PATTERN =
  /(?:^|[^a-z0-9])(?:tts|veo|imagen|embedding|embed|whisper|transcribe|moderation|realtime|native-audio|audio|live|robotics|computer-use|aqa|deep-research|image|dall-e|sora|search-preview)(?:[^a-z0-9]|$)/iu;
