import type { AdminUserPlanAssignment } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { resolveEntitlementValidUntilLabel } from '@/utilities/admin-user-statistics.utility';

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
