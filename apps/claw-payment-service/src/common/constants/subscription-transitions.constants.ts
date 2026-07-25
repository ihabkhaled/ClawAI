import { SubscriptionStatus } from '@claw/shared-types';

// The complete, closed set of legal subscription transitions.
//
// A status is never assigned directly anywhere in this service: every change
// goes through assertTransition(). An exhaustive table means an illegal jump —
// CANCELLED back to ACTIVE without a new payment, say — is a rejected write
// rather than a silently granted entitlement.
export const SUBSCRIPTION_TRANSITIONS: Readonly<
  Record<SubscriptionStatus, readonly SubscriptionStatus[]>
> = Object.freeze({
  // Created locally; the provider object does not exist yet.
  [SubscriptionStatus.PENDING]: Object.freeze([
    SubscriptionStatus.INCOMPLETE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.EXPIRED,
  ]),
  // Provider object exists, first payment unconfirmed.
  [SubscriptionStatus.INCOMPLETE]: Object.freeze([
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.EXPIRED,
  ]),
  [SubscriptionStatus.ACTIVE]: Object.freeze([
    SubscriptionStatus.PAST_DUE,
    SubscriptionStatus.PAUSED,
    SubscriptionStatus.CANCEL_AT_PERIOD_END,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.REFUNDED,
    SubscriptionStatus.CHARGEBACK,
    SubscriptionStatus.SUSPENDED,
    // Renewal succeeded — a self-transition that advances the period.
    SubscriptionStatus.ACTIVE,
  ]),
  // A later successful charge recovers to ACTIVE; grace expiry ends it.
  [SubscriptionStatus.PAST_DUE]: Object.freeze([
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.EXPIRED,
    SubscriptionStatus.SUSPENDED,
    SubscriptionStatus.CHARGEBACK,
    SubscriptionStatus.REFUNDED,
  ]),
  [SubscriptionStatus.PAUSED]: Object.freeze([
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.EXPIRED,
  ]),
  // Still effective until the period ends; the user may resume.
  [SubscriptionStatus.CANCEL_AT_PERIOD_END]: Object.freeze([
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.EXPIRED,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.REFUNDED,
    SubscriptionStatus.CHARGEBACK,
  ]),
  // Terminal for entitlement. A refund or dispute can still land afterwards,
  // which is why those two remain reachable.
  [SubscriptionStatus.CANCELLED]: Object.freeze([
    SubscriptionStatus.REFUNDED,
    SubscriptionStatus.CHARGEBACK,
  ]),
  [SubscriptionStatus.EXPIRED]: Object.freeze([
    SubscriptionStatus.REFUNDED,
    SubscriptionStatus.CHARGEBACK,
  ]),
  // A dispute can follow a refund; nothing else may.
  [SubscriptionStatus.REFUNDED]: Object.freeze([SubscriptionStatus.CHARGEBACK]),
  // Fully terminal. Restoring access after a dispute requires a NEW paid
  // subscription, never a transition back.
  [SubscriptionStatus.CHARGEBACK]: Object.freeze([]),
  // An admin may lift a suspension, or end it permanently.
  [SubscriptionStatus.SUSPENDED]: Object.freeze([
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.EXPIRED,
  ]),
});

// Statuses that grant the user their paid plan.
//
// PAST_DUE is included because a failed renewal must not revoke access
// instantly — the grace window is what separates "your card bounced" from
// "you have been cut off". Whether the grace window is still open is a
// separate, time-based check; membership here is necessary, not sufficient.
export const ENTITLEMENT_BEARING_STATUSES: readonly SubscriptionStatus[] = Object.freeze([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.CANCEL_AT_PERIOD_END,
]);

// Statuses from which no further transition is possible.
export const TERMINAL_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = Object.freeze([
  SubscriptionStatus.CHARGEBACK,
]);

// Statuses that revoke paid entitlement the moment they are reached, with no
// grace period — money was taken back, or the account is under investigation.
export const IMMEDIATE_REVOCATION_STATUSES: readonly SubscriptionStatus[] = Object.freeze([
  SubscriptionStatus.CHARGEBACK,
  SubscriptionStatus.SUSPENDED,
]);
