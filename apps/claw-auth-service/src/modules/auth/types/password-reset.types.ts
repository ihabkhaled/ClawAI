/**
 * The answer to a password-reset request.
 *
 * `accepted` is always true and carries no information: the endpoint answers
 * identically whether or not an account exists at that address (rule 43 §1).
 * `retryAfterSeconds` is on EVERY response, including the one that actually
 * sent a link — a field that only appears when refusing is itself a signal.
 */
export type RequestPasswordResetResult = {
  accepted: true;
  retryAfterSeconds: number;
};
