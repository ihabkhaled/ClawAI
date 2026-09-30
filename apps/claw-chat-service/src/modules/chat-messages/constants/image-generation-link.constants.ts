/** image-service route chat calls to link the assistant message to a generation. */
export const IMAGE_ASSISTANT_MESSAGE_LINK_PATH =
  '/api/v1/internal/images/{GENERATION_ID}/assistant-message';

/** A best-effort link: never holds the turn longer than this. */
export const IMAGE_ASSISTANT_MESSAGE_LINK_TIMEOUT_MS = 5_000;
