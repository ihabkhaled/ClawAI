import { GUARDS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '@claw/shared-auth';

import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';
import { SyncHealthInternalController } from '../sync-health-internal.controller';
import { WorkspaceSearchInternalController } from '../workspace-search-internal.controller';

describe('workspace internal controllers (security audit 2026-11-27)', () => {
  it.each([
    ['internal/workspace/search', WorkspaceSearchInternalController],
    ['internal/workspace/sync', SyncHealthInternalController],
  ] as const)('%s requires the service token on every route', (_path, controller) => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[];

    expect(guards).toContain(ServiceTokenGuard);
  });

  it('keeps @Public() on the handlers so the user-JWT guard does not refuse a service', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        WorkspaceSearchInternalController.prototype.searchInternal,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SyncHealthInternalController.prototype.getHealth),
    ).toBe(true);
  });
});
