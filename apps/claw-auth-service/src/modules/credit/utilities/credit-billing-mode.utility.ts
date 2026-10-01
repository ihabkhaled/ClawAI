import { PaygBillingMode } from '@claw/shared-types';

import { EntitlementGrantType } from '../../../generated/prisma';
import { type EffectiveAssignmentProvenance } from '../../plans/types/plans.types';

/**
 * Names how a user is billed, from how their plan assignment was obtained
 * (F108, ADR-078 addendum). Pure, so the whole decision table is one spec.
 *
 * Only two provenances are positively classified:
 *
 *   FREE_DEFAULT       -> PAYG          no subscription, so any metered spend is
 *                                       drawn from credit the user bought
 *   PAID_SUBSCRIPTION  -> SUBSCRIPTION  flat price; per-call cost is margin
 *
 * Everything else is `UNKNOWN`, which every consumer treats as "do not
 * disclose": a trial (nothing is charged), an administrator grant, a promotion,
 * a migration, a missing assignment, and any provenance this table has not been
 * taught. A new `EntitlementGrantType` therefore starts hidden, never disclosed.
 */
export function billingModeForAssignment(
  assignment: EffectiveAssignmentProvenance | null,
): PaygBillingMode {
  if (assignment === null || assignment.isTrial) {
    return PaygBillingMode.UNKNOWN;
  }
  switch (assignment.grantType) {
    case EntitlementGrantType.FREE_DEFAULT:
      return PaygBillingMode.PAYG;
    case EntitlementGrantType.PAID_SUBSCRIPTION:
      return PaygBillingMode.SUBSCRIPTION;
    default:
      return PaygBillingMode.UNKNOWN;
  }
}
