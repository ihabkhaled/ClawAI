import { EventPattern } from '@claw/shared-types';

/**
 * Only the payment service may add credit to a wallet. A security boundary,
 * not a label: an event claiming a paid top-up from any other producer is
 * rejected outright, exactly as `ENTITLEMENT_GRANTING_PATTERNS` treats a paid
 * activation.
 */
export const CREDIT_TOPUP_PRODUCER = 'claw-payment-service';

// Envelope version this consumer understands. An unknown version is rejected
// rather than guessed at — a misread field here credits or destroys money.
export const SUPPORTED_CREDIT_TOPUP_SCHEMA_VERSION = 1;

/**
 * The two money-moving credit patterns.
 *
 * Deliberately NOT added to `ENTITLEMENT_GRANTING_PATTERNS`. That list routes
 * into `EntitlementApplierService`, which changes a user's PLAN; a top-up
 * changes a balance and must never touch entitlement. Same inbox table, same
 * four guards, different applier.
 */
export const CREDIT_TOPUP_PATTERNS: ReadonlyArray<string> = [
  EventPattern.BILLING_CREDIT_TOPUP_SUCCEEDED,
  EventPattern.BILLING_CREDIT_TOPUP_REVERSED,
];
