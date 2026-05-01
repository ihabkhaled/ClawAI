import type { ModelChoice } from '../types/ai-action.types';

// Last-resort placeholder when neither local Ollama nor any cloud connector is reachable.
// Resolution always tries the live catalog first; this is only used so the system can
// degrade to a deterministic shape rather than crashing the AI-action call. The string
// values are intentionally not env-var-configurable — they describe an unreachable system,
// not a user preference.
export const LOCAL_LAST_RESORT_MODEL: ModelChoice = {
  provider: 'local-ollama',
  model: 'unavailable',
  displayName: 'No local model installed',
};

export const CONNECTOR_FALLBACK_MODEL: ModelChoice = {
  provider: 'NONE',
  model: 'unavailable',
  displayName: 'No connector configured',
};

export const MODEL_CATALOG_FETCH_TIMEOUT_MS = 5000;
