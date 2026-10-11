import { vi } from 'vitest';

import { ADMIN_USAGE_LISTED_EVENT } from '../../constants/admin-usage-explorer.constants';
import { AdminUsageAuditService } from '../admin-usage-audit.service';

describe('AdminUsageAuditService.recordListed', () => {
  it('publishes the listed event with actor, no target and the given filters', async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const service = new AdminUsageAuditService({ publish } as never);

    await service.recordListed('admin-1', { hasSearch: true, rows: 3 });

    expect(publish).toHaveBeenCalledWith(
      ADMIN_USAGE_LISTED_EVENT,
      expect.objectContaining({
        actorUserId: 'admin-1',
        targetUserId: null,
        filters: { hasSearch: true, rows: 3 },
      }),
    );
  });

  it('swallows a broker failure so the read still succeeds', async () => {
    const service = new AdminUsageAuditService({
      publish: vi.fn().mockRejectedValue(new Error('down')),
    } as never);

    await expect(service.recordListed('admin-1', {})).resolves.toBeUndefined();
  });
});
