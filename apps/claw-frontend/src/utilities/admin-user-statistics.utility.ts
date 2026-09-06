import {
  AdminUserTrialState,
  EntitlementGrantType,
  type AdminUserPlanAssignment,
} from '@claw/shared-types';

import { formatDateTimeSafe } from './date.utility';

/**
 * How long paid entitlement lasts, as one label.
 *
 * Three genuinely different answers, and none of them may collapse into
 * another: no grant at all, a grant that never expires (`null`), and a grant
 * with a deadline. Rendering the `null` case as a blank or a dash would read as
 * "we do not know", when it actually means the access does not lapse.
 *
 * Lives here rather than inline in the panel because the component file is pure
 * render composition, and because the three-way choice deserves its own test.
 */
export function resolveEntitlementValidUntilLabel(
  assignment: AdminUserPlanAssignment | null,
  noGrantLabel: string,
  neverExpiresLabel: string,
): string {
  if (assignment === null) {
    return noGrantLabel;
  }
  if (assignment.entitlementValidUntil === null) {
    return neverExpiresLabel;
  }
  return formatDateTimeSafe(assignment.entitlementValidUntil);
}

/**
 * Which of the three trial labels the badge shows, and how loud it is.
 *
 * The panel used to ask only `isExpired`, so anything not yet past its
 * `expiresAt` rendered as a live countdown. That is how an account granted Pro
 * for a year reported "Free trial — 23 days left": the trial had been replaced
 * a week earlier, but the redemption row it was read from outlives the
 * assignment that created it and goes on counting down.
 *
 * SUPERSEDED is deliberately quiet (`outline`), like an expired trial: neither
 * is something an operator needs to act on. Only a genuinely running trial is
 * emphasised, because that is the one with a deadline attached.
 */
export function resolveTrialBadgeKey(state: AdminUserTrialState): string {
  if (state === AdminUserTrialState.SUPERSEDED) {
    return 'admin.userSubscriptionTrialSuperseded';
  }
  return state === AdminUserTrialState.EXPIRED
    ? 'admin.userSubscriptionTrialExpired'
    : 'admin.userSubscriptionTrialDaysRemaining';
}

export function isTrialCountingDown(state: AdminUserTrialState): boolean {
  return state === AdminUserTrialState.ACTIVE;
}

/**
 * Which "no subscription" sentence is true for this account.
 *
 * "No subscription" and "free account" are different statements, and the panel
 * used to print the second whenever the first was true. An admin-granted Pro
 * user has no subscription and never will — describing them as "an ordinary
 * free account. Nothing has been bought and nothing is owed" tells an operator
 * the opposite of what the account holds, and is exactly the sentence that
 * appeared under a Pro grant valid until 2027.
 *
 * Anything other than FREE_DEFAULT counts as granted, including
 * PAID_SUBSCRIPTION. A paid grant with no subscription behind it is a real
 * disagreement between auth-service and payment-service, and calling it a free
 * account would bury the one case an operator most needs to see.
 */
export function resolveNoSubscriptionDescriptionKey(
  assignment: AdminUserPlanAssignment | null,
): string {
  if (assignment === null || assignment.grantType === EntitlementGrantType.FREE_DEFAULT) {
    return 'admin.userSubscriptionNoneDescription';
  }
  return 'admin.userSubscriptionGrantedNoneDescription';
}
