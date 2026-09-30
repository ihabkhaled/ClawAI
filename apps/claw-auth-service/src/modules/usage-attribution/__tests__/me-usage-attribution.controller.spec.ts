import { vi } from 'vitest';

import { MeUsageAttributionController } from '../controllers/me-usage-attribution.controller';
import { type UsageAttributionService } from '../services/usage-attribution.service';
import { type AuthenticatedUser } from '../../../common/types';

describe('MeUsageAttributionController', () => {
  const usage = { breakdownForUser: vi.fn(), breakdownForOrganization: vi.fn() };
  const controller = new MeUsageAttributionController(
    usage as Pick<
      UsageAttributionService,
      'breakdownForUser' | 'breakdownForOrganization'
    > as UsageAttributionService,
  );
  const user = { id: 'user-1' } as AuthenticatedUser;

  it('reads the breakdown for the token owner, never a parameter', async () => {
    usage.breakdownForUser.mockResolvedValue({ totals: {} });
    await controller.getMyBreakdown(user, {});
    expect(usage.breakdownForUser).toHaveBeenCalledWith('user-1', {});
  });

  it('passes the caller as the requester of an organization aggregate', async () => {
    usage.breakdownForOrganization.mockResolvedValue({ totals: {} });
    await controller.getOrganizationUsage(user, 'org-1', { from: '2026-09-01T00:00:00Z' });
    expect(usage.breakdownForOrganization).toHaveBeenCalledWith('org-1', 'user-1', {
      from: '2026-09-01T00:00:00Z',
    });
  });
});
