export const BEST_OF_N_POLL_INTERVAL_MS = 3000;
export const BEST_OF_N_POLL_MESSAGES_LIMIT = 50;
export const MAX_BEST_OF_N_POLL_COUNT = 60;
export const BEST_OF_N_CONTENT_MIN_LENGTH = 1;

// Allowed values for the "N candidates" picker. The backend DTO caps at
// 5; values below 2 would defeat the purpose of comparison.
export const BEST_OF_N_COUNT_OPTIONS: readonly number[] = [2, 3, 4, 5] as const;

// Default candidate count when the page first loads.
export const BEST_OF_N_DEFAULT_COUNT = 3;
