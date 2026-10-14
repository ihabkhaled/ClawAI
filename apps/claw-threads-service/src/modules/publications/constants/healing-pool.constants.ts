/** Most models handed to the generation service as the healing pool (it tries at most four per seat). */
export const HEALING_POOL_MAX = 8;

/** The last-resort model: a cheap, large-window Gemini flash model, always disclosed in the step log. */
export const HEALING_SAFE_DEFAULT_PROVIDER = 'GEMINI';
export const HEALING_SAFE_DEFAULT_MODEL_PATTERN = /flash/iu;
