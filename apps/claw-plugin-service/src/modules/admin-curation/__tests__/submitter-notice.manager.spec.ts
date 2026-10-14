import { EventPattern, UserNotificationKind } from '@claw/shared-types';

import { SubmitterNoticeManager } from '../managers/submitter-notice.manager';

const NOTICE = {
  serverId: 'srv-1',
  ownerUserId: 'user-owner',
  serverName: 'My tracker',
  decidedAt: new Date('2026-10-15T09:00:00.000Z'),
};

describe('admin approval queue: SubmitterNoticeManager', () => {
  it('asks auth-service to notify the submitter with a kind, a link and short params', async () => {
    const rabbit = { publishConfirmed: vi.fn().mockResolvedValue(undefined) };
    const manager = new SubmitterNoticeManager(rabbit as never);

    await manager.approved(NOTICE);
    await manager.rejected({ ...NOTICE, reason: 'Not allowed.' });

    expect(rabbit.publishConfirmed).toHaveBeenNthCalledWith(
      1,
      EventPattern.USER_NOTIFICATION_REQUESTED,
      {
        dedupeKey: `mcp-server-approved:srv-1:${String(NOTICE.decidedAt.getTime())}`,
        userId: 'user-owner',
        kind: UserNotificationKind.MCP_SERVER_APPROVED,
        link: '/plugins/servers',
        params: { title: 'My tracker' },
      },
    );
    expect(rabbit.publishConfirmed).toHaveBeenNthCalledWith(
      2,
      EventPattern.USER_NOTIFICATION_REQUESTED,
      expect.objectContaining({
        kind: UserNotificationKind.MCP_SERVER_REJECTED,
        params: { title: 'My tracker', excerpt: 'Not allowed.' },
      }),
    );
  });

  it('swallows a broker failure so the decision stands', async () => {
    const rabbit = { publishConfirmed: vi.fn().mockRejectedValue(new Error('broker down')) };
    const manager = new SubmitterNoticeManager(rabbit as never);

    await expect(manager.approved(NOTICE)).resolves.toBeUndefined();
  });
});
