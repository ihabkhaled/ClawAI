import { describe, expect, it, vi } from 'vitest';
import { MobileDeviceScope } from '@claw/shared-types';
import { DeviceScope } from '../../../../common/enums/device-scope.enum';
import { DeviceRepository } from '../../repositories/device.repository';
import { DeviceService } from '../device.service';
import type { Device } from '../../../../generated/prisma';

function stub<T extends object>(
  type: abstract new (...args: never[]) => T,
  members: Partial<T>,
): T {
  return Object.assign(Object.create(type.prototype) as T, members);
}

function build(tokenClass: string) {
  const row = {
    id: 'device-1',
    userId: 'user-1',
    tokenClass,
    scopesCsv: tokenClass === 'mobile' ? 'runs:read' : 'shell:exec',
    status: 'ACTIVE',
  } as Device;
  const updateScopes = vi.fn().mockResolvedValue(row);
  const repo = stub(DeviceRepository, {
    findByIdForUser: vi.fn().mockResolvedValue(row),
    findById: vi.fn().mockResolvedValue(row),
    updateScopes,
    updateName: vi.fn().mockResolvedValue(row),
  });
  return { service: new DeviceService(repo), updateScopes };
}

describe('DeviceService scope edits keep the device class (F097)', () => {
  it('refuses widening a mobile device to a shell scope, writing nothing', async () => {
    const { service, updateScopes } = build('mobile');
    await expect(
      service.updateForUser('user-1', 'device-1', { scopes: [DeviceScope.SHELL_EXEC] }),
    ).rejects.toMatchObject({ status: 400 });
    expect(updateScopes).not.toHaveBeenCalled();
  });

  it('allows narrowing a mobile device within the run scopes', async () => {
    const { service, updateScopes } = build('mobile');
    await service.updateForUser('user-1', 'device-1', { scopes: [MobileDeviceScope.RUNS_READ] });
    expect(updateScopes).toHaveBeenCalledWith('device-1', 'runs:read');
  });

  it('refuses giving a desktop device the run scopes', async () => {
    const { service, updateScopes } = build('device');
    await expect(
      service.updateForUser('user-1', 'device-1', { scopes: [MobileDeviceScope.RUNS_APPROVE] }),
    ).rejects.toMatchObject({ status: 400 });
    expect(updateScopes).not.toHaveBeenCalled();
  });

  it('still lets a desktop device edit its desktop scopes', async () => {
    const { service, updateScopes } = build('device');
    await service.updateForUser('user-1', 'device-1', { scopes: [DeviceScope.FS_READ] });
    expect(updateScopes).toHaveBeenCalledWith('device-1', 'fs:read');
  });
});
