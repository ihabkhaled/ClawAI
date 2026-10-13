import { BadRequestException } from '@nestjs/common';

import { PublicationReportModerationService } from '../publication-report-moderation.service';

describe('PublicationReportModerationService', () => {
  function create() {
    const community = { resolveModerationReport: vi.fn().mockResolvedValue({ resolved: true }) };
    const revocation = {
      revoke: vi.fn().mockResolvedValue({ revoked: true, alreadyRevoked: false }),
      findOpenReportTarget: vi.fn().mockResolvedValue({ publicationId: 'p1', commentId: null }),
    };
    return {
      service: new PublicationReportModerationService(community as never, revocation as never),
      community,
      revocation,
    };
  }

  it('resolves a publication-level report and revokes when asked', async () => {
    const { service, revocation } = create();
    await expect(
      service.resolve('r1', 'mod-1', { status: 'RESOLVED', revokePublication: true } as never),
    ).resolves.toEqual({ resolved: true, revoked: true });
    expect(revocation.revoke).toHaveBeenCalledWith('p1', 'mod-1', undefined);
  });

  it('does not revoke when the moderator did not choose it', async () => {
    const { service, revocation } = create();
    await service.resolve('r1', 'mod-1', { status: 'RESOLVED' } as never);
    expect(revocation.revoke).not.toHaveBeenCalled();
  });

  it('rejects revoking from a comment report before resolving anything', async () => {
    const { service, revocation, community } = create();
    revocation.findOpenReportTarget.mockResolvedValue({ publicationId: 'p1', commentId: 'c1' });
    await expect(
      service.resolve('r1', 'mod-1', { status: 'RESOLVED', revokePublication: true } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(community.resolveModerationReport).not.toHaveBeenCalled();
  });

  it('skips the revoke when the report is no longer open', async () => {
    const { service, revocation, community } = create();
    revocation.findOpenReportTarget.mockResolvedValue(null);
    community.resolveModerationReport.mockRejectedValue(new Error('conflict'));
    await expect(
      service.resolve('r1', 'mod-1', { status: 'RESOLVED', revokePublication: true } as never),
    ).rejects.toThrow('conflict');
    expect(revocation.revoke).not.toHaveBeenCalled();
  });
});
