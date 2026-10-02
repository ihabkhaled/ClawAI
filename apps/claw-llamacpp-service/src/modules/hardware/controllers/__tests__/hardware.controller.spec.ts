import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { vi } from 'vitest';

import { HardwareController } from '../hardware.controller';

describe('HardwareController', () => {
  it('returns the current snapshot from the service', async () => {
    const snapshot = { gpus: [] };
    const service = {
      getCurrent: vi.fn().mockResolvedValue(snapshot),
      refresh: vi.fn(),
    } as never;
    await expect(new HardwareController(service).getCurrent()).resolves.toBe(snapshot);
  });

  it('refresh delegates to the service', async () => {
    const snapshot = { gpus: [] };
    const service = {
      getCurrent: vi.fn(),
      refresh: vi.fn().mockResolvedValue(snapshot),
    } as never;
    await expect(new HardwareController(service).refresh()).resolves.toBe(snapshot);
  });

  // ADR-146 review: a refresh spawns GPU probes, so it is an admin action.
  it('refresh requires ADMIN_MODELS_MANAGE', () => {
    const required: unknown = Reflect.getMetadata(
      REQUIRE_PERMISSIONS_KEY,
      HardwareController.prototype.refresh,
    );
    expect(required).toEqual([Permission.ADMIN_MODELS_MANAGE]);
  });
});
