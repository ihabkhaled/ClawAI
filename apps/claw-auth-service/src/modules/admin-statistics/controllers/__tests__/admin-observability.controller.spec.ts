import { Permission } from '@claw/shared-types';
import { vi } from 'vitest';

import { PERMISSIONS_KEY } from '../../../../app/decorators/permissions.decorator';
import { ROLES_KEY } from '../../../../app/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums';
import { AdminObservabilityController } from '../admin-observability.controller';

const actor = { id: 'admin-1', email: 'a@b.co', role: UserRole.ADMIN, sessionId: 's' };

function build() {
  const service = {
    overview: vi.fn().mockResolvedValue({ kind: 'overview' }),
    filterOptions: vi.fn().mockResolvedValue({ kind: 'options' }),
    healthReport: vi.fn().mockResolvedValue({ kind: 'health' }),
    listUsers: vi.fn().mockResolvedValue({ kind: 'users' }),
    exportUsers: vi.fn().mockResolvedValue({ kind: 'export' }),
    listProviders: vi.fn().mockResolvedValue({ kind: 'providers' }),
    providerDetail: vi.fn().mockResolvedValue({ kind: 'provider' }),
    listModels: vi.fn().mockResolvedValue({ kind: 'models' }),
    modelDetail: vi.fn().mockResolvedValue({ kind: 'model' }),
    listPlans: vi.fn().mockResolvedValue({ kind: 'plans' }),
    listWorkflows: vi.fn().mockResolvedValue({ kind: 'workflows' }),
  };
  return { service, controller: new AdminObservabilityController(service as never) };
}

describe('AdminObservabilityController', () => {
  it('is admin-only and gated on ADMIN_USAGE_VIEW', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminObservabilityController)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, AdminObservabilityController)).toEqual([
      Permission.ADMIN_USAGE_VIEW,
    ]);
  });

  it('passes the acting admin id to the two audited routes', async () => {
    const { controller, service } = build();
    await controller.users({} as never, actor);
    await controller.exportUsers({} as never, actor);
    expect(service.listUsers).toHaveBeenCalledWith({}, 'admin-1');
    expect(service.exportUsers).toHaveBeenCalledWith({}, 'admin-1');
  });

  it('delegates every other route to the service without logic of its own', async () => {
    const { controller, service } = build();
    const query = { limit: 5 } as never;
    expect(await controller.overview(query)).toEqual({ kind: 'overview' });
    expect(await controller.filterOptions(query)).toEqual({ kind: 'options' });
    expect(await controller.health(query)).toEqual({ kind: 'health' });
    expect(await controller.providers(query)).toEqual({ kind: 'providers' });
    expect(await controller.models(query)).toEqual({ kind: 'models' });
    expect(await controller.plans(query)).toEqual({ kind: 'plans' });
    expect(await controller.workflows(query)).toEqual({ kind: 'workflows' });
    expect(await controller.modelDetail(query)).toEqual({ kind: 'model' });
    expect(await controller.providerDetail({ provider: 'GEMINI' }, query)).toEqual({
      kind: 'provider',
    });
    expect(service.providerDetail).toHaveBeenCalledWith('GEMINI', query);
    expect(service.listProviders).toHaveBeenCalledWith(query);
  });
});
