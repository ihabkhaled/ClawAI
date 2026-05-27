export const PROGRESS_DB_THROTTLE_MS = 1000;
export const PROGRESS_SSE_THROTTLE_MS = 500;
export const PULL_RETRY_MAX = 10;
export const PULL_RETRY_BASE_MS = 1000;
export const PULL_RETRY_MAX_BACKOFF_MS = 30_000;
export const INSTALL_RETRY_MAX = 5;
export const INSTALL_RETRY_BASE_MS = 2000;
export const SPEED_SMOOTHING_ALPHA = 0.3;
// Ollama's pull stream emits intermediate non-byte statuses; these signal install phase.
export const INSTALL_PHASE_STATUS_KEYWORDS = [
  'verifying',
  'verifying sha256',
  'writing manifest',
  'removing any unused layers',
  'success',
];
