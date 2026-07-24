// Consumer-side inbox state. A consumer records the event id BEFORE applying it
// and keys on it, so RabbitMQ's at-least-once delivery cannot double-apply an
// entitlement change.
export enum InboxEventStatus {
  RECEIVED = 'RECEIVED',
  PROCESSED = 'PROCESSED',
  DUPLICATE = 'DUPLICATE',
  // Newer state already applied — a stale event must not overwrite it.
  SUPERSEDED = 'SUPERSEDED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}
