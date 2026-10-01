import { PaygBillingMode } from '@claw/shared-types';

import { EntitlementGrantType } from '../../../../generated/prisma';
import { billingModeForAssignment } from '../credit-billing-mode.utility';

/**
 * The F108 disclosure table. Only two provenances are positively classified;
 * every other row must be UNKNOWN, because UNKNOWN means "do not show the cost".
 */
describe('billingModeForAssignment', () => {
  it('classifies a free-default assignment as PAYG', () => {
    expect(
      billingModeForAssignment({ grantType: EntitlementGrantType.FREE_DEFAULT, isTrial: false }),
    ).toBe(PaygBillingMode.PAYG);
  });

  it('classifies a paid subscription as SUBSCRIPTION', () => {
    expect(
      billingModeForAssignment({
        grantType: EntitlementGrantType.PAID_SUBSCRIPTION,
        isTrial: false,
      }),
    ).toBe(PaygBillingMode.SUBSCRIPTION);
  });

  it.each([
    EntitlementGrantType.ADMIN_GRANT,
    EntitlementGrantType.PROMOTIONAL,
    EntitlementGrantType.MIGRATION,
  ])('fails closed to UNKNOWN for %s', (grantType) => {
    expect(billingModeForAssignment({ grantType, isTrial: false })).toBe(PaygBillingMode.UNKNOWN);
  });

  it.each(Object.values(EntitlementGrantType))(
    'is UNKNOWN for a trial plan whatever the provenance (%s)',
    (grantType) => {
      expect(billingModeForAssignment({ grantType, isTrial: true })).toBe(PaygBillingMode.UNKNOWN);
    },
  );

  it('is UNKNOWN when the user has no assignment in force', () => {
    expect(billingModeForAssignment(null)).toBe(PaygBillingMode.UNKNOWN);
  });

  it('is UNKNOWN for a provenance this table was never taught', () => {
    const future = { grantType: 'SOMETHING_NEW' as EntitlementGrantType, isTrial: false };
    expect(billingModeForAssignment(future)).toBe(PaygBillingMode.UNKNOWN);
  });
});
