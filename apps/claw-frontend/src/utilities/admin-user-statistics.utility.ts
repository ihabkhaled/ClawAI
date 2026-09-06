import type { AdminUserPlanAssignment } from '@claw/shared-types';

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
