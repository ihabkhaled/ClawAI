import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
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
