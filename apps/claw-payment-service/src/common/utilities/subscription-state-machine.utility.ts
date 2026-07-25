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
  const allowed = SUBSCRIPTION_TRANSITIONS[from];
  if (allowed === undefined) {
    // Fail CLOSED on an unrecognised source status: a status this table does
    // not know about must not be treated as freely transitionable.
    return false;
  }
  return allowed.includes(to);
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
  if (status === SubscriptionStatus.PAST_DUE) {
    // A past-due subscription with no grace window recorded is not entitled:
    // absence of a deadline must not read as an unlimited one.
    return gracePeriodEndsAtMs !== null && nowMs < gracePeriodEndsAtMs;
  }
  return true;
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
  return SUBSCRIPTION_TRANSITIONS[from] ?? [];
}
