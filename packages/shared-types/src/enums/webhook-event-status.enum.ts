// Processing state of an inbound gateway webhook. A row is written BEFORE any
// business state changes, so a replay is detected by the
// (gateway, providerEventId) unique index rather than by re-running handlers.
export enum WebhookEventStatus {
  RECEIVED = 'RECEIVED',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  // Handler failed; retried by the reconciliation job, not by the gateway alone.
  FAILED = 'FAILED',
  // Verified but intentionally not acted on (unknown/irrelevant event type).
  IGNORED = 'IGNORED',
  DUPLICATE = 'DUPLICATE',
}
