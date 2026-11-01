import { vi } from 'vitest';

import { ImageGenerationStatus } from '../../../../generated/prisma';
import { cancelImageSchema } from '../../dto/generate-image.dto';
import { InternalImageController } from '../internal-image.controller';
import type { ImageGenerationService } from '../../services/image-generation.service';

describe('InternalImageController cancel', () => {
  const service = { cancelGenerationForService: vi.fn() };
  const controller = new InternalImageController(
    service as unknown as ImageGenerationService,
    {} as never,
  );

  it('cancels as the named owner', async () => {
    service.cancelGenerationForService.mockResolvedValue({
      id: 'i1',
      status: ImageGenerationStatus.CANCELLED,
      cancelled: true,
    });

    const result = await controller.cancel('i1', { userId: 'u1' });

    expect(service.cancelGenerationForService).toHaveBeenCalledWith('i1', 'u1');
    expect(result).toEqual({ id: 'i1', status: 'CANCELLED', cancelled: true });
  });

  it('requires userId', () => {
    expect(cancelImageSchema.safeParse({}).success).toBe(false);
  });
});
