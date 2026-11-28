export interface ErrorResponseBody {
  statusCode: number;
  message: string;
  code?: string;
  errorCode?: string;
  errors?: unknown[];
  // PAYG refusals put the two numbers a user needs to act on the wire beside
  // the code. Declared explicitly rather than as an open bag: an error body is
  // readable by the customer, so every field that reaches it is reviewed once,
  // here, instead of wherever the exception happened to be constructed.
  availableMicroUsd?: number;
  requiredMicroUsd?: number | null;
  // ACCOUNT_BANNED: the end of a timed ban (ISO-8601) or null, and whether it is a lifetime ban.
  bannedUntil?: string | null;
  banPermanent?: boolean;
  // ACCOUNT_BANNED only: true for an automatic, temporary suspension (ADR-233). Never a reason or a count.
  autoSuspended?: boolean;
  // Anti-abuse refusals: the request field at fault (DISPOSABLE_EMAIL -> 'email') and,
  // for SIGNUP_TEMPORARILY_LIMITED, the wait that is also sent as Retry-After.
  field?: string;
  retryAfterSeconds?: number;
  timestamp: string;
}
