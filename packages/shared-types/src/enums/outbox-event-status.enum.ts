// Transactional outbox delivery state. The row is written in the SAME database
// transaction as the payment/subscription change, so an entitlement event can
// never be lost between "payment committed" and "message published".
export enum OutboxEventStatus {
  PENDING = 'PENDING',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  // Exhausted retries; surfaced to the reconciliation dashboard.
  DEAD_LETTERED = 'DEAD_LETTERED',
}
