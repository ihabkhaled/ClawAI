import { HttpStatus } from '@nestjs/common';
import { vi } from 'vitest';

import { BusinessException } from '../../../../common/errors';
import { ImageGenerationOwnerGuard } from '../image-generation-owner.guard';

const contextFor = (id: string | undefined, userId: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ params: { id }, user: { id: userId } }) }),
  }) as never;

describe('ImageGenerationOwnerGuard (GET /images/:id/events)', () => {
  it("admits the generation's owner", async () => {
    const service = { getByIdForUser: vi.fn().mockResolvedValue({ id: 'img-1' }) };
    await expect(
      new ImageGenerationOwnerGuard(service as never).canActivate(contextFor('img-1', 'u1')),
    ).resolves.toBe(true);
    expect(service.getByIdForUser).toHaveBeenCalledWith('img-1', 'u1');
  });

  // The stream was @Public(): anyone holding an id could watch another user's
  // job. Refused here, before Nest sends 200 and opens a stream.
  it('refuses a non-owner with the service 404 before a stream opens', async () => {
    const notFound = new BusinessException(
      'Image generation not found',
      'IMAGE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
    );
    const service = { getByIdForUser: vi.fn().mockRejectedValue(notFound) };
    await expect(
      new ImageGenerationOwnerGuard(service as never).canActivate(contextFor('img-1', 'u2')),
    ).rejects.toBe(notFound);
    expect(service.getByIdForUser).toHaveBeenCalledWith('img-1', 'u2');
  });

  it('checks an empty id rather than skipping the check when :id is absent', async () => {
    const service = { getByIdForUser: vi.fn().mockRejectedValue(new Error('not found')) };
    await expect(
      new ImageGenerationOwnerGuard(service as never).canActivate(contextFor(undefined, 'u1')),
    ).rejects.toThrow('not found');
    expect(service.getByIdForUser).toHaveBeenCalledWith('', 'u1');
  });
});
