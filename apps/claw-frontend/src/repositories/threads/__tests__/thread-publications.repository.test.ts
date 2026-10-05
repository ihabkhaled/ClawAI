import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import { apiClient } from '@/services/shared/api-client';

import { threadPublicationsRepository } from '../thread-publications.repository';

vi.mock('@/services/shared/api-client');

describe('threadPublicationsRepository.cancelGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the accepted cancellation status', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { publicationId: 'publication-1', status: 'CANCEL_REQUESTED' },
      status: 202,
    });

    await expect(threadPublicationsRepository.cancelGeneration('publication-1')).resolves.toEqual({
      publicationId: 'publication-1',
      status: 'CANCEL_REQUESTED',
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/thread-publications/publication-1/cancel-generation',
      {},
    );
  });
});

describe('threadPublicationsRepository.changeRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only the owned publication change requests', async () => {
    const requests = [
      {
        id: 'request-1',
        suggestion: 'Clarify the conclusion',
        status: 'PENDING',
        ownerResponse: null,
        acceptedRevisionId: null,
        createdAt: '2026-10-05T12:00:00.000Z',
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: requests, status: 200 });

    await expect(threadPublicationsRepository.listChangeRequests('publication-1')).resolves.toEqual(
      requests,
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      '/thread-publications/publication-1/change-requests',
    );
  });

  it('sends the owner decision to the publication-scoped resolution endpoint', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { resolved: true, edit: null },
      status: 200,
    });

    await expect(
      threadPublicationsRepository.resolveChangeRequest('publication-1', 'request-1', {
        status: ThreadPublicationChangeRequestStatus.Rejected,
        ownerResponse: 'This is outside the article scope.',
      }),
    ).resolves.toEqual({ resolved: true, edit: null });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/thread-publications/publication-1/change-requests/request-1',
      { status: 'REJECTED', ownerResponse: 'This is outside the article scope.' },
    );
  });
});

describe('threadPublicationsRepository.publicCommunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the published article by its public slug', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        id: 'publication-1',
        slug: 'clear-writing',
        title: 'Clear writing',
        content: { markdown: '# Clear writing', citations: [{ url: 'https://source.example' }] },
        publishedAt: '2026-10-05T12:00:00.000Z',
      },
      status: 200,
    });

    await expect(threadPublicationsRepository.getPublic('clear-writing')).resolves.toMatchObject({
      id: 'publication-1',
      content: { markdown: '# Clear writing' },
    });
    expect(apiClient.get).toHaveBeenCalledWith('/thread-publications/public/clear-writing');
  });

  it('loads comments and reaction totals without reader identities', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: [{ id: 'comment-1', content: 'Useful.', createdAt: '2026-10-05T12:00:00.000Z' }],
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { likes: 3, dislikes: 1, viewerReaction: null },
        status: 200,
      });

    await expect(threadPublicationsRepository.listPublicComments('clear-writing')).resolves.toEqual(
      [{ id: 'comment-1', content: 'Useful.', createdAt: '2026-10-05T12:00:00.000Z' }],
    );
    await expect(
      threadPublicationsRepository.getPublicReactionSummary('clear-writing'),
    ).resolves.toEqual({ likes: 3, dislikes: 1, viewerReaction: null });
    expect(apiClient.get).toHaveBeenNthCalledWith(
      1,
      '/thread-publications/public/clear-writing/comments',
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      '/thread-publications/public/clear-writing/reactions',
    );
  });

  it('submits authenticated community actions to their public-slug endpoints', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'community-action', status: 'OPEN' },
      status: 201,
    });
    vi.mocked(apiClient.delete).mockResolvedValueOnce({
      data: { likes: 3, dislikes: 1, viewerReaction: null },
      status: 200,
    });

    await threadPublicationsRepository.addPublicComment('clear-writing', { content: 'Useful.' });
    await threadPublicationsRepository.setPublicReaction('clear-writing', {
      value: ThreadPublicationReaction.Like,
    });
    await threadPublicationsRepository.removePublicReaction('clear-writing');
    await threadPublicationsRepository.requestPublicChange('clear-writing', {
      suggestion: 'Add a source.',
    });
    await threadPublicationsRepository.reportPublicPublication('clear-writing', {
      reason: ThreadPublicationReportReason.Other,
      details: 'Please review this item.',
    });

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      '/thread-publications/public/clear-writing/comments',
      { content: 'Useful.' },
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      '/thread-publications/public/clear-writing/reactions',
      { value: ThreadPublicationReaction.Like },
    );
    expect(apiClient.delete).toHaveBeenCalledWith(
      '/thread-publications/public/clear-writing/reactions',
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      3,
      '/thread-publications/public/clear-writing/change-requests',
      { suggestion: 'Add a source.' },
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      4,
      '/thread-publications/public/clear-writing/reports',
      { reason: ThreadPublicationReportReason.Other, details: 'Please review this item.' },
    );
  });
});
