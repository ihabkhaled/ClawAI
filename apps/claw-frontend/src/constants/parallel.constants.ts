export const MIN_PARALLEL_MODELS = 2;
export const MAX_PARALLEL_MODELS = 5;
export const PARALLEL_GRID_COL_CLASSES: Record<string, string> = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-2',
};
export const PARALLEL_POLL_INTERVAL_MS = 3000;
export const PARALLEL_POLL_MESSAGES_LIMIT = 50;
// Backstop matching the 7 orchestration labs that already cap polling
// (best-of-n, cost-ensemble, decompose, pipeline, repair, role-pack,
// verify): without it, a compare run where every lane errors out (no lane
// ever reaches `expectedModelCount`) polls forever and the submit button
// stays disabled forever. 60 polls * 3s interval = 3 minutes.
export const MAX_PARALLEL_POLL_COUNT = 60;
export const SCORE_LENGTH_DIVISOR = 1000;
export const SCORE_LATENCY_DIVISOR = 120_000;
export const SCORE_TOKEN_DIVISOR = 500;
export const SCORE_LENGTH_WEIGHT = 0.4;
export const SCORE_LATENCY_WEIGHT = 0.3;
export const SCORE_TOKEN_WEIGHT = 0.3;
export const SCORE_DEFAULT_TOKEN_VALUE = 0.5;
export const PARALLEL_CONTENT_PREVIEW_LENGTH = 300;
