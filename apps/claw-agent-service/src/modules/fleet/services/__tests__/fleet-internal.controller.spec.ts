import { vi } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '@claw/shared-auth';

import { ServiceTokenGuard } from '../../../../common/guards/service-token.guard';
import { FleetInternalController } from '../../controllers/fleet-internal.controller';
import type { OrganizationUsageScopeService } from '../organization-usage-scope.service';

describe('FleetInternalController', () => {
  it('is service-token guarded, not user-reachable', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, FleetInternalController)).toEqual([
      ServiceTokenGuard,
    ]);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, FleetInternalController)).toBe(true);
  });

  it('delegates the administrator check with the requester from the query', async () => {
    const forAdministrator = vi
      .fn()
      .mockResolvedValue({ organizationId: 'org-1', memberUserIds: [] });
    const controller = new FleetInternalController({
      forAdministrator,
    } as Partial<OrganizationUsageScopeService> as OrganizationUsageScopeService);

    await controller.getUsageScope('org-1', { requesterId: 'admin-1' });
    expect(forAdministrator).toHaveBeenCalledWith('org-1', 'admin-1');
  });
});
