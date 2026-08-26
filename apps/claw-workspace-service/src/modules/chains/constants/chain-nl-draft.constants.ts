// Phase 09 — 1 initial attempt + 1 retry-with-the-Zod-error-appended per
// model in the fallback chain, since chat-service has no structured-output
// mode to guarantee a valid response on the first try.
export const MAX_NL_DRAFT_ATTEMPTS_PER_MODEL = 2;
