import { PrivacyClass } from '../../../generated/prisma';

/**
 * Privacy classes the cloud router's candidate set may ever include.
 *
 * A LOCAL_ONLY or LOCAL_PREFERRED deployment must never be selectable by the
 * cloud path, independent of whatever routed the request here. `handleAuto`
 * already steers privacy-enforced domains away before the eligibility filter
 * runs, but the filter does not treat that as its only guard — it is a unit
 * worth trusting on its own.
 */
export const CLOUD_ROUTER_ELIGIBLE_PRIVACY_CLASSES: readonly PrivacyClass[] = [
  PrivacyClass.PUBLIC_OK,
  PrivacyClass.CLOUD_PERMITTED,
];
