import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import 'reflect-metadata';

import { PublicationModerationController } from '../publication-moderation.controller';

describe('PublicationModerationController', () => {
  const user = { id: 'mod-1' } as never;
  function create() {
    const community = { listModerationReports: vi.fn().mockResolvedValue([]) };
    const revocation = {
      revoke: vi.fn().mockResolvedValue({ revoked: true, alreadyRevoked: false }),
    };
    const reportModeration = { resolve: vi.fn().mockResolvedValue({ resolved: true }) };
    return {
      controller: new PublicationModerationController(
        community as never,
        revocation as never,
        reportModeration as never,
      ),
      revocation,
      reportModeration,
    };
  }

  it('guards every route with the moderation permission (PermissionGuard denies others)', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, PublicationModerationController)).toEqual([
      Permission.THREAD_PUBLICATIONS_MODERATE,
    ]);
  });

  it('revokes with the moderator id and reason', async () => {
    const { controller, revocation } = create();
    await controller.revoke('p1', { reason: 'spam' }, user);
    expect(revocation.revoke).toHaveBeenCalledWith('p1', 'mod-1', 'spam');
  });

  it('delegates report resolution to the moderation service', async () => {
    const { controller, reportModeration } = create();
    await controller.resolveReport('r1', { status: 'RESOLVED' } as never, user);
    expect(reportModeration.resolve).toHaveBeenCalledWith('r1', 'mod-1', { status: 'RESOLVED' });
  });
});
