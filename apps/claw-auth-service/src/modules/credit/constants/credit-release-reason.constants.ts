/**
 * Why a hold was given back without the user receiving anything.
 *
 * Stored verbatim on the RESERVATION_RELEASE ledger row, so "my balance moved
 * and nothing happened" is answerable without correlating logs. A tuple rather
 * than an enum because it is consumed by `z.enum`, which needs the literal
 * values; the ledger column is free text and accepts whatever this list grows to.
 */
export const CREDIT_RELEASE_REASONS = ['PROVIDER_ERROR', 'CANCELLED', 'TIMEOUT'] as const;

/** What the sweeper records when it reclaims an abandoned hold. */
export const CREDIT_RELEASE_REASON_TIMEOUT = 'TIMEOUT';
