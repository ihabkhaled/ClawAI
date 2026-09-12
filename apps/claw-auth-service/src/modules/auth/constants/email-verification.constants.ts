export const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * How long an address must wait between confirmation-email resends.
 *
 * The window is claimed for the SUBMITTED ADDRESS whether or not an account
 * exists behind it. That is the part that matters: if the cooldown only applied
 * to real accounts, "no cooldown" would answer the question the endpoint exists
 * to refuse — whether that address is registered here (rule 43 §1).
 */
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Redis key prefix for the resend cooldown. The address is hashed, never
 * stored: a Redis keyspace dump should not be a list of who is signing up.
 */
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_PREFIX = 'auth:email-verification:resend:';
