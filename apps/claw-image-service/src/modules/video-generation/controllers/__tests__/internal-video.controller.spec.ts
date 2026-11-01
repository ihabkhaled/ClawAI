import { vi } from 'vitest';

import { cancelVideoSchema } from '../../dto/generate-video.dto';
import { InternalVideoController } from '../internal-video.controller';

describe('InternalVideoController cancel', () => {
  const service = { cancelGenerationForUser: vi.fn() };
  const controller = new InternalVideoController(service as never);

  it('cancels as the named owner and returns {id, status, cancelled}', async () => {
    service.cancelGenerationForUser.mockResolvedValue({
      id: 'v1',
      status: 'COMPLETED',
      cancelled: false,
    });

    const result = await controller.cancel('v1', { userId: 'u1' });

    expect(service.cancelGenerationForUser).toHaveBeenCalledWith('v1', 'u1');
    expect(result).toEqual({ id: 'v1', status: 'COMPLETED', cancelled: false });
  });

  it('requires userId', () => {
    expect(cancelVideoSchema.safeParse({}).success).toBe(false);
  });
});
