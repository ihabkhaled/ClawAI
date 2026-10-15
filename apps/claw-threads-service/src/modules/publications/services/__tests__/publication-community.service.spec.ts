import {
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { PublicationReportResolution } from '../../../../common/enums/publication-report-resolution.enum';

import { PublicationCommunityService } from '../publication-community.service';

describe('PublicationCommunityService', () => {
  function createService() {
    const publications = {
      setPublicReaction: vi
        .fn()
        .mockResolvedValue({ likes: 1, dislikes: 0, viewerReaction: 'LIKE' }),
      removePublicReaction: vi
        .fn()
        .mockResolvedValue({ likes: 0, dislikes: 0, viewerReaction: null }),
      findPublicReactionSummary: vi
        .fn()
        .mockResolvedValue({ likes: 1, dislikes: 0, viewerReaction: null }),
      createPublicChangeRequest: vi.fn().mockResolvedValue({
        kind: 'CREATED',
        request: { id: 'request-1', status: 'PENDING' },
      }),
      createPublicReport: vi.fn().mockResolvedValue({ id: 'report-1', status: 'OPEN' }),
      findOwnedChangeRequests: vi.fn().mockResolvedValue([]),
      findOwnedChangeRequest: vi.fn().mockResolvedValue(null),
      resolveOwnedChangeRequest: vi.fn().mockResolvedValue(true),
      findOpenModerationReports: vi.fn().mockResolvedValue([]),
      resolveModerationReport: vi.fn().mockResolvedValue(true),
    };
    const lifecycle = { editRevision: vi.fn().mockResolvedValue({ revisionId: 'revision-1' }) };
    const notifier = {
      threadReacted: vi.fn().mockResolvedValue(undefined),
      changeRequested: vi.fn().mockResolvedValue(undefined),
      changeDecided: vi.fn().mockResolvedValue(undefined),
    };
    return {
      service: new PublicationCommunityService(
        publications as never,
        lifecycle as never,
        undefined,
        notifier as never,
      ),
      publications,
      lifecycle,
      notifier,
    };
  }

  it('passes the authenticated identity to change requests', async () => {
    const { service, publications } = createService();

    await service.requestChange('public-slug', 'user-7', { suggestion: 'Add a citation' });

    expect(publications.createPublicChangeRequest).toHaveBeenCalledWith('public-slug', 'user-7', {
      suggestion: 'Add a citation',
    });
  });

  it('notifies the owner of a change request with the saved request id', async () => {
    const { service, notifier } = createService();

    await service.requestChange('public-slug', 'user-7', { suggestion: 'Add a citation' });

    expect(notifier.changeRequested).toHaveBeenCalledWith(
      'public-slug',
      'user-7',
      'request-1',
      'Add a citation',
    );
  });

  it.each([
    ['NOT_FOUND', NotFoundException, undefined],
    ['OWN_THREAD', ForbiddenException, undefined],
    ['USER_LIMIT', HttpException, 429],
    ['THREAD_LIMIT', HttpException, 429],
  ] as const)(
    'refuses a suggestion with outcome %s and notifies nobody',
    async (kind, error, status) => {
      const { service, publications, notifier } = createService();
      publications.createPublicChangeRequest.mockResolvedValue({ kind });

      const attempt = service.requestChange('public-slug', 'user-7', { suggestion: 'x' });

      await expect(attempt).rejects.toBeInstanceOf(error);
      if (status) await expect(attempt).rejects.toMatchObject({ status });
      expect(notifier.changeRequested).not.toHaveBeenCalled();
    },
  );

  it('tells the requester about an accepted decision exactly once, after it is saved', async () => {
    const { service, publications, notifier } = createService();
    publications.findOwnedChangeRequest.mockResolvedValue({ id: 'request-1', status: 'PENDING' });

    await service.resolveOwnerChangeRequest('publication-1', 'owner-1', 'request-1', {
      status: 'ACCEPTED',
    });

    expect(publications.resolveOwnedChangeRequest).toHaveBeenCalledWith(
      'publication-1',
      'owner-1',
      'request-1',
      { status: 'ACCEPTED' },
      null,
    );
    expect(notifier.changeDecided).toHaveBeenCalledTimes(1);
    expect(notifier.changeDecided).toHaveBeenCalledWith('request-1', 'ACCEPTED');
  });

  it('accepting without a revised article does not start a paid review', async () => {
    const { service, publications, lifecycle } = createService();
    publications.findOwnedChangeRequest.mockResolvedValue({ id: 'request-1', status: 'PENDING' });
    await service.resolveOwnerChangeRequest('publication-1', 'owner-1', 'request-1', {
      status: 'ACCEPTED',
    });
    expect(lifecycle.editRevision).not.toHaveBeenCalled();
  });

  it('tells the requester about a declined decision', async () => {
    const { service, publications, notifier } = createService();
    publications.findOwnedChangeRequest.mockResolvedValue({ id: 'request-1', status: 'PENDING' });

    await service.resolveOwnerChangeRequest('publication-1', 'owner-1', 'request-1', {
      status: 'REJECTED',
      ownerResponse: 'Out of scope',
    });

    expect(notifier.changeDecided).toHaveBeenCalledWith('request-1', 'DECLINED');
  });

  it('answers a repeated decision without deciding or notifying again', async () => {
    const { service, publications, notifier } = createService();
    publications.findOwnedChangeRequest.mockResolvedValue({ id: 'request-1', status: 'REJECTED' });

    await expect(
      service.resolveOwnerChangeRequest('publication-1', 'owner-1', 'request-1', {
        status: 'REJECTED',
      }),
    ).resolves.toEqual({ resolved: true, edit: null });
    expect(publications.resolveOwnedChangeRequest).not.toHaveBeenCalled();
    expect(notifier.changeDecided).not.toHaveBeenCalled();
  });

  it('refuses to flip a decision that was already made the other way', async () => {
    const { service, publications } = createService();
    publications.findOwnedChangeRequest.mockResolvedValue({ id: 'request-1', status: 'REJECTED' });

    await expect(
      service.resolveOwnerChangeRequest('publication-1', 'owner-1', 'request-1', {
        status: 'ACCEPTED',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets the losing side of two simultaneous identical decisions succeed quietly', async () => {
    const { service, publications, notifier } = createService();
    publications.findOwnedChangeRequest
      .mockResolvedValueOnce({ id: 'request-1', status: 'PENDING' })
      .mockResolvedValueOnce({ id: 'request-1', status: 'ACCEPTED', acceptedRevisionId: null });
    publications.resolveOwnedChangeRequest.mockResolvedValue(false);

    await expect(
      service.resolveOwnerChangeRequest('publication-1', 'owner-1', 'request-1', {
        status: 'ACCEPTED',
      }),
    ).resolves.toEqual({ resolved: true, edit: null });
    expect(notifier.changeDecided).not.toHaveBeenCalled();
  });

  it('reports a conflict when the other simultaneous decision differed', async () => {
    const { service, publications } = createService();
    publications.findOwnedChangeRequest
      .mockResolvedValueOnce({ id: 'request-1', status: 'PENDING' })
      .mockResolvedValueOnce({ id: 'request-1', status: 'REJECTED', acceptedRevisionId: null });
    publications.resolveOwnedChangeRequest.mockResolvedValue(false);

    await expect(
      service.resolveOwnerChangeRequest('publication-1', 'owner-1', 'request-1', {
        status: 'ACCEPTED',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('tells the notifier the reaction the person had before, so a switch does not notify twice', async () => {
    const { service, publications, notifier } = createService();
    publications.findPublicReactionSummary.mockResolvedValue({
      likes: 1,
      dislikes: 0,
      viewerReaction: 'LIKE',
    });

    await service.setReaction('public-slug', 'user-7', { value: 'DISLIKE' });

    expect(publications.findPublicReactionSummary).toHaveBeenCalledWith('public-slug', 'user-7');
    expect(notifier.threadReacted).toHaveBeenCalledWith('public-slug', 'user-7', 'DISLIKE', 'LIKE');
  });

  it('still saves the reaction when the previous one cannot be read', async () => {
    const { service, publications, notifier } = createService();
    publications.findPublicReactionSummary.mockRejectedValue(new Error('db'));

    await expect(
      service.setReaction('public-slug', 'user-7', { value: 'LIKE' }),
    ).resolves.toMatchObject({ likes: 1 });
    expect(notifier.threadReacted).toHaveBeenCalledWith('public-slug', 'user-7', 'LIKE', null);
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
