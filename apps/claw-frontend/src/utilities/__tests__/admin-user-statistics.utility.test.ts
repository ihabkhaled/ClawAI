import { AdminUserTrialState, type AdminUserPlanAssignment } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import {
  isTrialCountingDown,
  resolveEntitlementValidUntilLabel,
  resolveNoSubscriptionDescriptionKey,
  resolveTrialBadgeKey,
} from '@/utilities/admin-user-statistics.utility';

function makeAssignment(overrides: Partial<AdminUserPlanAssignment> = {}): AdminUserPlanAssignment {
  return {
    status: 'ACTIVE',
    grantType: 'ADMIN_GRANT',
    grantReason: 'Support gesture',
    startsAt: '2026-05-01T00:00:00.000Z',
    endsAt: null,
    entitlementValidUntil: null,
    sourceSubscriptionId: null,
    ...overrides,
  };
}

describe('resolveEntitlementValidUntilLabel', () => {
  it('reports the no-grant label when there is no assignment at all', () => {
    expect(resolveEntitlementValidUntilLabel(null, 'none', 'never')).toBe('none');
  });

  // `null` here means the entitlement does not lapse. Rendering it as a blank
  // or a dash would read as "unknown", which is a different claim.
  it('distinguishes a never-expiring grant from a missing one', () => {
    expect(resolveEntitlementValidUntilLabel(makeAssignment(), 'none', 'never')).toBe('never');
  });

  it('formats a real deadline rather than reporting it as unlimited', () => {
    const label = resolveEntitlementValidUntilLabel(
      makeAssignment({ entitlementValidUntil: '2026-12-01T00:00:00.000Z' }),
      'none',
      'never',
    );

    expect(label).not.toBe('never');
    expect(label).not.toBe('none');
    expect(label).toBe(new Date('2026-12-01T00:00:00.000Z').toLocaleString());
  });
});

// ── Reported 2026-09-06 ─────────────────────────────────────────────────────
// A Pro account granted for a year displayed "Free trial — 23 days left" and
// "This is an ordinary free account". Both came from reading one field in
// isolation: the trial countdown from a redemption row that outlives the
// assignment that created it, and the free-account sentence from the absence of
// a subscription, which an admin grant never produces in the first place.
describe('trial badge state', () => {
  it('does not show a countdown for a trial that a later grant replaced', () => {
    expect(resolveTrialBadgeKey(AdminUserTrialState.SUPERSEDED)).toBe(
      'admin.userSubscriptionTrialSuperseded',
    );
    expect(isTrialCountingDown(AdminUserTrialState.SUPERSEDED)).toBe(false);
  });

  it('shows the countdown only while the trial is the grant in force', () => {
    expect(resolveTrialBadgeKey(AdminUserTrialState.ACTIVE)).toBe(
      'admin.userSubscriptionTrialDaysRemaining',
    );
    expect(isTrialCountingDown(AdminUserTrialState.ACTIVE)).toBe(true);
  });

  it('keeps "ended" for a trial that ran out on its own', () => {
    expect(resolveTrialBadgeKey(AdminUserTrialState.EXPIRED)).toBe(
      'admin.userSubscriptionTrialExpired',
    );
    expect(isTrialCountingDown(AdminUserTrialState.EXPIRED)).toBe(false);
  });
});

describe('no-subscription description', () => {
  it('does not describe an admin-granted account as an ordinary free account', () => {
    const key = resolveNoSubscriptionDescriptionKey(makeAssignment({ grantType: 'ADMIN_GRANT' }));

    expect(key).toBe('admin.userSubscriptionGrantedNoneDescription');
  });

  it('still describes a genuinely free account as one', () => {
    const key = resolveNoSubscriptionDescriptionKey(makeAssignment({ grantType: 'FREE_DEFAULT' }));

    expect(key).toBe('admin.userSubscriptionNoneDescription');
  });

  it('treats no grant at all as a free account', () => {
    expect(resolveNoSubscriptionDescriptionKey(null)).toBe('admin.userSubscriptionNoneDescription');
  });

  // A paid grant with no subscription behind it is auth-service and
  // payment-service disagreeing. Calling it a free account would bury the one
  // case an operator most needs to notice.
  it('does not call a paid grant with no subscription a free account', () => {
    const key = resolveNoSubscriptionDescriptionKey(
      makeAssignment({ grantType: 'PAID_SUBSCRIPTION' }),
    );

    expect(key).toBe('admin.userSubscriptionGrantedNoneDescription');
  });
});
