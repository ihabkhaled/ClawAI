export const MIN_PARALLEL_MODELS = 2;
export const MAX_PARALLEL_MODELS = 5;
export const PARALLEL_GRID_COL_CLASSES: Record<string, string> = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-2',
};
export const PARALLEL_POLL_INTERVAL_MS = 3000;
export const PARALLEL_AUTO_NAVIGATE_DELAY_MS = 2000;
export const PARALLEL_POLL_MESSAGES_LIMIT = 50;
export const SCORE_LENGTH_DIVISOR = 1000;
export const SCORE_LATENCY_DIVISOR = 120_000;
export const SCORE_TOKEN_DIVISOR = 500;
export const SCORE_LENGTH_WEIGHT = 0.4;
export const SCORE_LATENCY_WEIGHT = 0.3;
export const SCORE_TOKEN_WEIGHT = 0.3;
export const SCORE_DEFAULT_TOKEN_VALUE = 0.5;
export const PARALLEL_CONTENT_PREVIEW_LENGTH = 300;
