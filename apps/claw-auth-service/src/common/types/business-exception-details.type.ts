/**
 * Extra, typed fields a domain error may put on the wire beside its code.
 *
 * Deliberately NOT a free-form record. Everything here is rendered to a user or
 * read by another service, so each field is declared once and reviewed — an
 * open bag would be the shortest path to a balance, a cost ceiling or a margin
 * leaking into an error body that a customer can read.
 */
export interface BusinessExceptionDetails {
  /** What the wallet can still spend, in integer micro-USD. */
  availableMicroUsd?: number;
  /** What this request needed. `null` when no single number would help. */
  requiredMicroUsd?: number | null;
  /** ACCOUNT_BANNED: when a timed ban ends (ISO-8601), `null` for a lifetime ban. */
  bannedUntil?: string | null;
  /** ACCOUNT_BANNED: true when the ban has no end date. */
  banPermanent?: boolean;
  /** The request field a refusal is about (DISPOSABLE_EMAIL -> `email`), so a client can mark it. */
  field?: string;
  /** Seconds to wait; the filter also sends it as the `Retry-After` header. */
  retryAfterSeconds?: number;
}
