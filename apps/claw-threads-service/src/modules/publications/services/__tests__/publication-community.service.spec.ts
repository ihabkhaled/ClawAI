import { ConflictException, NotFoundException } from '@nestjs/common';
import { PublicationReportResolution } from '../../../../common/enums/publication-report-resolution.enum';

import { PublicationCommunityService } from '../publication-community.service';

describe('PublicationCommunityService', () => {
  function createService() {
    const publications = {
      findPublicComments: vi.fn().mockResolvedValue([]),
      createPublicComment: vi.fn().mockResolvedValue({ id: 'comment-1' }),
      setPublicReaction: vi
        .fn()
        .mockResolvedValue({ likes: 1, dislikes: 0, viewerReaction: 'LIKE' }),
      removePublicReaction: vi
        .fn()
        .mockResolvedValue({ likes: 0, dislikes: 0, viewerReaction: null }),
      findPublicReactionSummary: vi
        .fn()
        .mockResolvedValue({ likes: 1, dislikes: 0, viewerReaction: null }),
      createPublicChangeRequest: vi.fn().mockResolvedValue({ id: 'request-1', status: 'PENDING' }),
      createPublicReport: vi.fn().mockResolvedValue({ id: 'report-1', status: 'OPEN' }),
      findOwnedChangeRequests: vi.fn().mockResolvedValue([]),
      findOwnedChangeRequest: vi.fn().mockResolvedValue(null),
      resolveOwnedChangeRequest: vi.fn().mockResolvedValue(true),
      findOpenModerationReports: vi.fn().mockResolvedValue([]),
      resolveModerationReport: vi.fn().mockResolvedValue(true),
    };
    const lifecycle = { editRevision: vi.fn().mockResolvedValue({ revisionId: 'revision-1' }) };
    return {
      service: new PublicationCommunityService(publications as never, lifecycle as never),
      publications,
      lifecycle,
    };
  }

  it('requires an existing public publication before exposing comments', async () => {
    const { service, publications } = createService();
    publications.findPublicComments.mockResolvedValue(null);

    await expect(service.listComments('private-slug')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('passes the authenticated identity to comments and change requests', async () => {
    const { service, publications } = createService();

    await service.addComment('public-slug', 'user-7', { content: 'A source is missing' });
    await service.requestChange('public-slug', 'user-7', { suggestion: 'Add a citation' });

    expect(publications.createPublicComment).toHaveBeenCalledWith('public-slug', 'user-7', {
      content: 'A source is missing',
    });
    expect(publications.createPublicChangeRequest).toHaveBeenCalledWith('public-slug', 'user-7', {
      suggestion: 'Add a citation',
    });
  });

  it('removes only the authenticated reader reaction', async () => {
    const { service, publications } = createService();

    await service.removeReaction('public-slug', 'user-7');

    expect(publications.removePublicReaction).toHaveBeenCalledWith('public-slug', 'user-7');
  });

  it('keeps change request and report details behind their safe service responses', async () => {
    const { service, publications } = createService();
    publications.createPublicReport.mockResolvedValue(null);

    await expect(
      service.report('public-slug', 'user-7', { reason: 'OTHER', details: 'private detail' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(publications.createPublicReport).toHaveBeenCalledWith('public-slug', 'user-7', {
      reason: 'OTHER',
      details: 'private detail',
    });
  });

  it("prevents resolving someone else's change request and already-closed reports", async () => {
    const { service, publications } = createService();
    publications.resolveOwnedChangeRequest.mockResolvedValue(false);
    publications.resolveModerationReport.mockResolvedValue(false);
    publications.findOwnedChangeRequest.mockResolvedValue(null);

    await expect(
      service.resolveOwnerChangeRequest('publication-1', 'wrong-owner', 'request-1', {
        status: 'ACCEPTED',
        revision: {
          markdown: 'Updated article',
          citations: [{ evidenceId: 'evidence-1', url: 'https://example.com/source' }],
          capMicroUsd: 1000,
          idempotencyKey: 'edit-1',
          correlationId: 'request-1',
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(publications.resolveOwnedChangeRequest).not.toHaveBeenCalled();
    await expect(
      service.resolveModerationReport('report-1', 'moderator-1', {
        status: PublicationReportResolution.RESOLVED,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('sends accepted suggestions through the paid revision review before recording them', async () => {
    const { service, publications, lifecycle } = createService();
    publications.findOwnedChangeRequest.mockResolvedValue({ id: 'request-1', status: 'PENDING' });
    const revision = {
      markdown: 'Reviewed update',
      citations: [{ evidenceId: 'evidence-1', url: 'https://example.com/source' }],
      capMicroUsd: 1000,
      idempotencyKey: 'edit-1',
      correlationId: 'request-1',
    };

    await expect(
      service.resolveOwnerChangeRequest('publication-1', 'owner-1', 'request-1', {
        status: 'ACCEPTED',
        revision,
      }),
    ).resolves.toEqual({ resolved: true, edit: { revisionId: 'revision-1' } });
    expect(lifecycle.editRevision).toHaveBeenCalledWith('publication-1', 'owner-1', revision);
    expect(publications.resolveOwnedChangeRequest).toHaveBeenCalledWith(
      'publication-1',
      'owner-1',
      'request-1',
      { status: 'ACCEPTED', revision },
      'revision-1',
    );
  });

  it('passes moderation decisions with the moderator identity', async () => {
    const { service, publications } = createService();

    await expect(
      service.resolveModerationReport('report-1', 'moderator-1', {
        status: PublicationReportResolution.RESOLVED,
        hideComment: true,
      }),
    ).resolves.toEqual({ resolved: true });
    expect(publications.resolveModerationReport).toHaveBeenCalledWith(
      'report-1',
      'moderator-1',
      'RESOLVED',
      true,
    );
  });
});
