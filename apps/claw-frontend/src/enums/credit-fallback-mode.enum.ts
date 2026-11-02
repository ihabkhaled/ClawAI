// Mirrors auth-service CreditFallbackMode: what happens when the user's picked
// credit model is used up. FALLBACK answers from an included model with a notice;
// STOP ends the turn with the credit message.
export enum CreditFallbackMode {
  Fallback = 'FALLBACK',
  Stop = 'STOP',
}
