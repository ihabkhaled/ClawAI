import { vi } from 'vitest';
import { Permission } from '@claw/shared-types';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { FileArchiveController } from '../file-archive.controller';

describe('FileArchiveController', () => {
  it('forwards the id and the caller, never a client-supplied owner', async () => {
    const getArchiveEntries = vi.fn().mockResolvedValue({ entries: [] });
    const controller = new FileArchiveController({
      getArchiveEntries,
    } as never);

    await controller.getArchiveEntries('zip-1', { id: 'user-1' } as never);

    expect(getArchiveEntries).toHaveBeenCalledWith('zip-1', 'user-1');
  });

  it('carries the same FILES_USE gate as every user-facing file route', () => {
    const required: unknown = Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, FileArchiveController);
    expect(required).toEqual([Permission.FILES_USE]);
  });
});
