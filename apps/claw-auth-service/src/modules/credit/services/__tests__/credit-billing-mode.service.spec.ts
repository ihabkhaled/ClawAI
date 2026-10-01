import { type Mock, vi } from 'vitest';
import { PaygBillingMode, UserRole } from '@claw/shared-types';

import { EntitlementGrantType } from '../../../../generated/prisma';
import { type AuthRepository } from '../../../auth/repositories/auth.repository';
import { type PlansRepository } from '../../../plans/repositories/plans.repository';
import { CreditBillingModeService } from '../credit-billing-mode.service';

describe('CreditBillingModeService', () => {
  let users: { findUserById: Mock };
  let plans: { findEffectiveProvenance: Mock };
  let service: CreditBillingModeService;

  beforeEach(() => {
    users = { findUserById: vi.fn().mockResolvedValue({ id: 'u1', role: UserRole.USER }) };
    plans = {
      findEffectiveProvenance: vi
        .fn()
        .mockResolvedValue({ grantType: EntitlementGrantType.FREE_DEFAULT, isTrial: false }),
    };
    service = new CreditBillingModeService(
      users as unknown as AuthRepository,
      plans as unknown as PlansRepository,
    );
  });

  it('names a free-default user PAYG', async () => {
    await expect(service.resolve('u1')).resolves.toBe(PaygBillingMode.PAYG);
  });

  it('names a paid subscriber SUBSCRIPTION', async () => {
    plans['findEffectiveProvenance'].mockResolvedValue({
      grantType: EntitlementGrantType.PAID_SUBSCRIPTION,
      isTrial: false,
    });
    await expect(service.resolve('u1')).resolves.toBe(PaygBillingMode.SUBSCRIPTION);
  });

  it('never classifies an administrator, even on a free-default plan', async () => {
    users['findUserById'].mockResolvedValue({ id: 'u1', role: UserRole.ADMIN });
    await expect(service.resolve('u1')).resolves.toBe(PaygBillingMode.UNKNOWN);
    expect(plans['findEffectiveProvenance']).not.toHaveBeenCalled();
  });

  it('is UNKNOWN for a user that cannot be found', async () => {
    users['findUserById'].mockResolvedValue(null);
    await expect(service.resolve('u1')).resolves.toBe(PaygBillingMode.UNKNOWN);
  });

  it('is UNKNOWN when the user has no assignment in force', async () => {
    plans['findEffectiveProvenance'].mockResolvedValue(null);
    await expect(service.resolve('u1')).resolves.toBe(PaygBillingMode.UNKNOWN);
  });

  it('is UNKNOWN, not a thrown error, when a lookup fails', async () => {
    plans['findEffectiveProvenance'].mockRejectedValue(new Error('db down'));
    await expect(service.resolve('u1')).resolves.toBe(PaygBillingMode.UNKNOWN);
    users['findUserById'].mockRejectedValue(new Error('db down'));
    await expect(service.resolve('u1')).resolves.toBe(PaygBillingMode.UNKNOWN);
  });
});
