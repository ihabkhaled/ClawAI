/**
 * F099: a signed webhook that fires a prompt routine now.
 *
 * The signing format (headers, `sha256=<hex>` over `<timestamp>.<raw body>`,
 * 5-minute skew window) is the channels webhook's, deliberately: a sender
 * written for one works for the other.
 */

/** Domain-separation label so the derived secret can never equal another HMAC use of the key. */
export const ROUTINE_WEBHOOK_SECRET_LABEL = 'claw.agent.routine.webhook.v1';

/** At most one accepted delivery per routine in this window; a failed fire frees it. */
export const ROUTINE_WEBHOOK_MIN_SECONDS_BETWEEN_DELIVERIES = 60;

export const ROUTINE_WEBHOOK_RATE_KEY_PREFIX = 'agent:routine-webhook:rate:';

/** Raw bodies beyond this are refused. The body is never read into the prompt. */
export const ROUTINE_WEBHOOK_MAX_BODY_BYTES = 16_384;

/** Public path of the receiving route, relative to the API origin. */
export const ROUTINE_WEBHOOK_PATH = '/api/v1/agent/routines/webhook';

/** The idempotency key is a digest of the signature, so a replayed request cannot run the job twice. */
export const ROUTINE_WEBHOOK_IDEMPOTENCY_PREFIX = 'webhook-';
export const ROUTINE_WEBHOOK_IDEMPOTENCY_DIGEST_CHARS = 40;

export const ROUTINE_WEBHOOK_SIGNATURE_FORMAT =
  'sha256=HMAC_SHA256(secret, "<timestamp>.<raw body>") as hex';
