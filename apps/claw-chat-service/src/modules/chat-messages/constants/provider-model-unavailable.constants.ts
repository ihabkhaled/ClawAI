// A provider answered that the model itself is gone: retired, never existed
// for this key, or decommissioned (ADR-151). Another model can still answer, so
// this is substitutable; the user reads the translated `messageKey`.
export const PROVIDER_MODEL_UNAVAILABLE_CODE = 'PROVIDER_MODEL_UNAVAILABLE';

export const PROVIDER_MODEL_UNAVAILABLE_MESSAGE =
  'This model is no longer available from its provider. Choose another model.';

export const PROVIDER_MODEL_UNAVAILABLE_MESSAGE_KEY = 'chat.errors.providerModelUnavailable';

// Statuses a provider uses for "no such model": 404/410 (OpenAI, Ollama), and
// 400 for providers that answer a retired model that way (Groq-style
// `model_decommissioned`).
export const PROVIDER_MODEL_UNAVAILABLE_STATUSES: readonly number[] = [400, 404, 410];

// OpenAI:  {"error":{"code":"model_not_found","message":"The model `X` has been deprecated..."}}
//          "The model `X` does not exist or you do not have access to it."
// Ollama:  "model 'x' not found"
// Groq:    "The model `x` has been decommissioned and is no longer supported."
// NVIDIA NIM: {"status":404,"detail":"Function '<id>': Not found for account '<id>'"} - the
//          model is listed but this key cannot call it.
// The sentence must be ABOUT the model, so a 404 for a missing file or route
// never counts.
export const PROVIDER_MODEL_UNAVAILABLE_PATTERN =
  /model_not_found|model_decommissioned|\bfunction\b[^.]{0,80}?not found for account|\bmodel\b[^.]{0,120}?(?:has been (?:deprecated|decommissioned|retired|removed|sunset)|does not exist|not found|no longer (?:available|supported))/iu;

// connector-service: counts the failure against the model row.
export const PROVIDER_MODEL_UNAVAILABLE_RECORD_PATH =
  '/api/v1/internal/connectors/models/unavailable';

export const PROVIDER_MODEL_UNAVAILABLE_RECORD_TIMEOUT_MS = 2_000;
