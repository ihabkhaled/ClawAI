import { beforeEach, describe, expect, it, vi } from 'vitest';

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
