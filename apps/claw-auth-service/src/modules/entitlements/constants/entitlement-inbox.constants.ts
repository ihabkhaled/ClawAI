import { EventPattern } from '@claw/shared-types';

// Only the payment service may move a user onto a paid plan. This is a security
// boundary, not a label: an event claiming a paid activation from any other
// producer is rejected outright.
export const PAYMENT_SERVICE_PRODUCER = 'claw-payment-service';

// Envelope version this consumer understands. An unknown version is parked
// rather than guessed at — entitlement is a security decision, and a
// misinterpreted field could grant access nobody paid for.
export const SUPPORTED_BILLING_SCHEMA_VERSION = 1;

// Event patterns that GRANT or EXTEND entitlement.
export const ENTITLEMENT_GRANTING_PATTERNS: ReadonlyArray<string> = [
  EventPattern.BILLING_SUBSCRIPTION_ACTIVATED,
  EventPattern.BILLING_SUBSCRIPTION_RENEWED,
  EventPattern.BILLING_SUBSCRIPTION_UPGRADED,
  EventPattern.BILLING_SUBSCRIPTION_DOWNGRADED,
];

// Event patterns that REVOKE entitlement immediately.
export const ENTITLEMENT_REVOKING_PATTERNS: ReadonlyArray<string> = [
  EventPattern.BILLING_SUBSCRIPTION_CANCELLED,
  EventPattern.BILLING_SUBSCRIPTION_EXPIRED,
  EventPattern.BILLING_SUBSCRIPTION_SUSPENDED,
  EventPattern.BILLING_PAYMENT_REFUNDED,
  EventPattern.BILLING_PAYMENT_CHARGEBACK,
];

// The plan a revoked user falls back to. Leaving them plan-less would fail
// closed on every gate and read as an outage to them.
export const FREE_PLAN_SLUG = 'free';
