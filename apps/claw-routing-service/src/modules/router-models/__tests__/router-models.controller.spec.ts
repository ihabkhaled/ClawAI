import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { RouterModelsController } from '../controllers/router-models.controller';
import { ROLES_KEY } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import type { RouterModelsService } from '../services/router-models.service';
import type { ModelDiscoveryService } from '../services/model-discovery.service';

// Built live (2026-08-16) alongside the discovery.run endpoint this
// controller had none of before — the controller itself had zero test
// coverage. Scoped to the new endpoint's authorization and delegation, not a
// retroactive backfill of the other pre-existing routes.
describe('RouterModelsController.runDiscovery', () => {
  const service = {} as unknown as RouterModelsService;
  const discoveryService = { run: jest.fn() };

  const controller = new RouterModelsController(
    service,
    discoveryService as unknown as ModelDiscoveryService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('is restricted to ADMIN and gated on ADMIN_MODELS_MANAGE', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, RouterModelsController.prototype.runDiscovery) as
      UserRole[] | undefined;
    expect(roles).toEqual([UserRole.ADMIN]);

    const permissions = Reflect.getMetadata(
      REQUIRE_PERMISSIONS_KEY,
      RouterModelsController.prototype.runDiscovery,
    ) as Permission[] | undefined;
    expect(permissions).toEqual([Permission.ADMIN_MODELS_MANAGE]);
  });

  it('delegates to ModelDiscoveryService.run and returns its result', async () => {
    const result = {
      imported: { definitionsCreated: 2, deploymentsCreated: 5, skipped: 1 },
      aliases: { resolved: 4, unresolved: [] },
    };
    discoveryService.run.mockResolvedValue(result);

    await expect(controller.runDiscovery()).resolves.toEqual(result);
    expect(discoveryService.run).toHaveBeenCalledTimes(1);
  });
});
