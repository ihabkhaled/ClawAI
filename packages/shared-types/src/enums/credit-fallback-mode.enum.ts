// What happens when a user's picked credit model is used up (ADR-161).
//
// FALLBACK (the default) answers from an included model with a notice. STOP ends
// the turn with the credit refusal instead, for the user who would rather be told
// than silently served by a different model.
export enum CreditFallbackMode {
  FALLBACK = 'FALLBACK',
  STOP = 'STOP',
}
