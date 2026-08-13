import { Permission } from '@claw/shared-types';

import { PERMISSIONS_KEY } from '../../../../app/decorators/permissions.decorator';
import { UserRole } from '../../../../common/enums';
import { DeploymentAdminController } from '../deployment-admin.controller';

describe('DeploymentAdminController', () => {
  const getStatus = jest.fn();
  const controller = new DeploymentAdminController({ getStatus } as never);

  beforeEach(() => jest.clearAllMocks());

  it('forwards the authenticated actor id', async () => {
    getStatus.mockResolvedValue({ state: 'unknown' });

    await controller.get({ id: 'super-admin', role: UserRole.ADMIN } as never);

    expect(getStatus).toHaveBeenCalledWith('super-admin');
  });

  it('requires the system-view permission', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, DeploymentAdminController.prototype.get)).toEqual([
      Permission.ADMIN_SYSTEM_VIEW,
    ]);
  });
});
