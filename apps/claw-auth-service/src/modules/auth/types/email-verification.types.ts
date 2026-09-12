/**
 * The answer to a confirmation-email resend request.
 *
 * `accepted` is ALWAYS true and carries no information — the endpoint says the
 * same thing for an address with a pending account, an address that is already
 * verified, and an address that has never been seen here. That is deliberate
 * (rule 43 §1).
 *
 * `retryAfterSeconds` is how long the caller must wait before another resend
 * for this address will do anything. It is safe to return, and it must be
 * returned on EVERY response rather than only when rate-limited, because a
 * field that appears only in one case is itself a signal. The window is claimed
 * per submitted address regardless of whether an account exists, so the number
 * describes the request, not the account.
 */
export type ResendVerificationResult = {
  accepted: true;
  retryAfterSeconds: number;
};
