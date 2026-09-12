/**
 * The visual register a verification outcome is shown in.
 *
 * Separate from EmailVerificationOutcome because the two do not map one to
 * one: `AlreadyHandled` is neither a success nor a failure — the account may
 * well be fine — so colouring it green would lie and colouring it red would
 * alarm someone who has nothing wrong with their account.
 */
export enum EmailVerificationTone {
  Pending = 'PENDING',
  Success = 'SUCCESS',
  Neutral = 'NEUTRAL',
  Failure = 'FAILURE',
}
