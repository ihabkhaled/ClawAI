import { HttpStatus } from '@nestjs/common';
import { BillingErrorCode, SubscriptionStatus } from '@claw/shared-types';

import {
  ENTITLEMENT_BEARING_STATUSES,
  IMMEDIATE_REVOCATION_STATUSES,
  SUBSCRIPTION_TRANSITIONS,
  TERMINAL_SUBSCRIPTION_STATUSES,
} from '../constants/subscription-transitions.constants';
import { BillingException } from '../errors/billing.exception';

// The single gate every subscription status change passes through.
//
// Nothing in this service assigns `status` directly. An unknown or illegal
// transition is a rejected write, never a silently granted entitlement.

export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  const allowed = transitionsFrom(from);
  // Fail CLOSED on an unrecognised source status: a status this table does
  // not know about must not be treated as freely transitionable.
  return allowed === undefined ? false : allowed.includes(to);
}

export function assertTransition(from: SubscriptionStatus, to: SubscriptionStatus): void {
  if (!canTransition(from, to)) {
    throw new BillingException(BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT, HttpStatus.CONFLICT, {
      from,
      to,
    });
  }
}

export function isTerminalStatus(status: SubscriptionStatus): boolean {
  return TERMINAL_SUBSCRIPTION_STATUSES.includes(status);
}

// Whether the status is one that CAN carry entitlement. Necessary, not
// sufficient — PAST_DUE also requires an open grace window, and every status
// requires entitlementValidUntil to still be in the future. Use
// `hasActiveEntitlement` for the real answer.
export function isEntitlementBearingStatus(status: SubscriptionStatus): boolean {
  return ENTITLEMENT_BEARING_STATUSES.includes(status);
}

// The authoritative "does this user have their paid plan right now?" check.
//
// Three independent conditions, all required:
//   1. the status can bear entitlement at all,
//   2. it is not a status that revokes immediately (chargeback, suspension),
//   3. the entitlement window has not lapsed — and for PAST_DUE, the grace
//      window is also still open.
//
// Time is passed in rather than read from the clock so this stays a pure
// function that a test can pin to an exact instant.
export function hasActiveEntitlement(
  status: SubscriptionStatus,
  entitlementValidUntilMs: number,
  gracePeriodEndsAtMs: number | null,
  nowMs: number,
): boolean {
  if (IMMEDIATE_REVOCATION_STATUSES.includes(status)) {
    return false;
  }
  if (!isEntitlementBearingStatus(status)) {
    return false;
  }
  if (nowMs >= entitlementValidUntilMs) {
    return false;
  }
  // A past-due subscription with no grace window recorded is not entitled:
  // absence of a deadline must not read as an unlimited one.
  return status === SubscriptionStatus.PAST_DUE
    ? gracePeriodEndsAtMs !== null && nowMs < gracePeriodEndsAtMs
    : true;
}

// The value written to Subscription.uniqueActiveKey.
//
// Returning the userId while entitlement-bearing and null otherwise is what
// makes "at most one effective subscription per user" a database guarantee:
// PostgreSQL treats NULLs as distinct, so any number of ended subscriptions
// coexist while a second live one collides on the unique index.
export function resolveUniqueActiveKey(status: SubscriptionStatus, userId: string): string | null {
  return isEntitlementBearingStatus(status) ? userId : null;
}

// Statuses reachable from here. Used by the admin UI to offer only the
// operations that will actually succeed.
export function allowedNextStatuses(from: SubscriptionStatus): readonly SubscriptionStatus[] {
  return transitionsFrom(from) ?? [];
}

function transitionsFrom(from: SubscriptionStatus): readonly SubscriptionStatus[] | undefined {
  switch (from) {
    case SubscriptionStatus.PENDING:
      return SUBSCRIPTION_TRANSITIONS[SubscriptionStatus.PENDING];
    case SubscriptionStatus.INCOMPLETE:
      return SUBSCRIPTION_TRANSITIONS[SubscriptionStatus.INCOMPLETE];
    case SubscriptionStatus.ACTIVE:
      return SUBSCRIPTION_TRANSITIONS[SubscriptionStatus.ACTIVE];
    case SubscriptionStatus.PAST_DUE:
      return SUBSCRIPTION_TRANSITIONS[SubscriptionStatus.PAST_DUE];
    case SubscriptionStatus.PAUSED:
      return SUBSCRIPTION_TRANSITIONS[SubscriptionStatus.PAUSED];
    case SubscriptionStatus.CANCEL_AT_PERIOD_END:
      return SUBSCRIPTION_TRANSITIONS[SubscriptionStatus.CANCEL_AT_PERIOD_END];
    case SubscriptionStatus.CANCELLED:
      return SUBSCRIPTION_TRANSITIONS[SubscriptionStatus.CANCELLED];
    case SubscriptionStatus.EXPIRED:
      return SUBSCRIPTION_TRANSITIONS[SubscriptionStatus.EXPIRED];
    case SubscriptionStatus.REFUNDED:
      return SUBSCRIPTION_TRANSITIONS[SubscriptionStatus.REFUNDED];
    case SubscriptionStatus.CHARGEBACK:
      return SUBSCRIPTION_TRANSITIONS[SubscriptionStatus.CHARGEBACK];
    case SubscriptionStatus.SUSPENDED:
      return SUBSCRIPTION_TRANSITIONS[SubscriptionStatus.SUSPENDED];
  }
}
