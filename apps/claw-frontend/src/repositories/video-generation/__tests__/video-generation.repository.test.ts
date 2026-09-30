import { beforeEach, describe, expect, it, vi } from 'vitest';

import { videoGenerationRepository } from '@/repositories/video-generation/video-generation.repository';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe('videoGenerationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getById GETs /videos/:id with no body or params and returns the data', async () => {
    mockGet.mockResolvedValue({ data: { id: 'vid-1', status: 'QUEUED' } });

    const result = await videoGenerationRepository.getById('vid-1');

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/videos/vid-1');
    expect(result).toEqual({ id: 'vid-1', status: 'QUEUED' });
  });

  it('retry POSTs /videos/:id/retry with no body and returns the row to follow', async () => {
    mockPost.mockResolvedValue({ data: { generationId: 'vid-2' } });

    const result = await videoGenerationRepository.retry('vid-1');

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/videos/vid-1/retry');
    expect(result).toEqual({ generationId: 'vid-2' });
  });

  it('cancel POSTs /videos/:id/cancel with no body and returns the status', async () => {
    mockPost.mockResolvedValue({ data: { id: 'vid-1', status: 'CANCELLED' } });

    const result = await videoGenerationRepository.cancel('vid-1');

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/videos/vid-1/cancel');
    expect(result).toEqual({ id: 'vid-1', status: 'CANCELLED' });
  });

  it('lets a failed request reject instead of swallowing it', async () => {
    mockGet.mockRejectedValue(new Error('403'));

    await expect(videoGenerationRepository.getById('vid-9')).rejects.toThrow('403');
  });
});
