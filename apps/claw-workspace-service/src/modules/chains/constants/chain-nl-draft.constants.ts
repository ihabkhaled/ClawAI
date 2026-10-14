// Phase 09 — 1 initial attempt + 1 retry-with-the-Zod-error-appended per
// model in the fallback chain, since chat-service has no structured-output
// mode to guarantee a valid response on the first try.
export const MAX_NL_DRAFT_ATTEMPTS_PER_MODEL = 2;

// The whole draft (every model, every attempt) must answer before nginx's 60 s
// read timeout turns it into an opaque 504; stop starting new calls after this.
export const NL_DRAFT_OVERALL_DEADLINE_MS = 45_000;
