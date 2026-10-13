import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/services/shared/api-client';

import { threadPublicationsRepository } from '../thread-publications.repository';

vi.mock('@/services/shared/api-client');

describe('threadPublicationsRepository owner progress routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the owner-only generation progress', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { jobId: 'job-1' }, status: 200 });

    await expect(threadPublicationsRepository.getGenerationProgress('pub/1')).resolves.toEqual({
      jobId: 'job-1',
    });
    expect(apiClient.get).toHaveBeenCalledWith('/thread-publications/pub%2F1/generation-progress');
  });

  it('posts a retry with the new idempotency key', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { jobId: 'job-2', status: 'QUEUED' },
      status: 202,
    });

    await expect(
      threadPublicationsRepository.retryGeneration('pub-1', { idempotencyKey: 'k', topic: 'T' }),
    ).resolves.toEqual({ jobId: 'job-2', status: 'QUEUED' });
    expect(apiClient.post).toHaveBeenCalledWith('/thread-publications/pub-1/retry-generation', {
      idempotencyKey: 'k',
      topic: 'T',
    });
  });

  it('deletes the publication', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined, status: 204 });

    await threadPublicationsRepository.deletePublication('pub-1');

    expect(apiClient.delete).toHaveBeenCalledWith('/thread-publications/pub-1');
  });
});
