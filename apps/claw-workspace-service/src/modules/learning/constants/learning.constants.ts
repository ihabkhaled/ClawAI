export const LEARNING_MEMORY_SOURCE = 'automation_learning';
export const LEARNING_MAX_MEMORIES_PER_USER_PER_KIND = 50;
export const LEARNING_DEFAULT_CONFIDENCE = 0.5;
export const LEARNING_MAX_PREFERENCE_CONTENT_LENGTH = 240;
export const LEARNING_HTTP_TIMEOUT_MS = 5000;

// Heuristic thresholds for fast-path classifier (no LLM call required)
export const LEARNING_EDIT_LENGTH_RATIO_SHORTEN = 0.6; // after/before ≤ 0.6 → "prefers shorter"
export const LEARNING_EDIT_LENGTH_RATIO_EXPAND = 1.5; // after/before ≥ 1.5 → "prefers more detail"
export const LEARNING_REJECT_REASON_MIN_LENGTH = 6;
