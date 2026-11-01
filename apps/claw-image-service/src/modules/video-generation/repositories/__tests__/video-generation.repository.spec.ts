import { vi } from 'vitest';

import { VideoGenerationStatus } from '../../../../generated/prisma';
import { VIDEO_ACTIVE_STATUSES } from '../../constants/video-generation.constants';
import { VideoGenerationRepository } from '../video-generation.repository';

describe('VideoGenerationRepository.setOperation', () => {
  it('only moves an active row, so a Stop during a blocking start is not undone', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = new VideoGenerationRepository({ videoGeneration: { updateMany } } as never);

    await repository.setOperation('video-1', 'omni:abc');

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'video-1', status: { in: [...VIDEO_ACTIVE_STATUSES] } },
      data: { providerOperationId: 'omni:abc', status: VideoGenerationStatus.GENERATING },
    });
    expect(VIDEO_ACTIVE_STATUSES).not.toContain(VideoGenerationStatus.CANCELLED);
  });
});
