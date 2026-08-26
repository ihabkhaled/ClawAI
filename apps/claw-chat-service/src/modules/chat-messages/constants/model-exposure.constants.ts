// A model's exposure is an administrator decision that changes rarely, and the
// check sits on the message-send path, so the answer is cached briefly rather
// than fetched per message. Sixty seconds is short enough that unexposing a
// model takes effect while someone is still looking at the admin screen, and
// long enough that a busy thread does not add a network hop per turn.
export const MODEL_EXPOSURE_CACHE_TTL_MS = 60_000;
export const MODEL_EXPOSURE_VALIDATION_PATH = '/api/v1/internal/connectors/models/validate-exposed';
export const MODEL_EXPOSURE_TIMEOUT_MS = 3_000;
