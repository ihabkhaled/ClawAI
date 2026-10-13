import type { AuthenticatedUser } from '@claw/shared-types';

import { PublicationOwnerController } from '../publication-owner.controller';

describe('PublicationOwnerController generation routes', () => {
  const user = { id: 'owner-1' } as AuthenticatedUser;

  function setup() {
    const generationOwner = {
      getProgress: vi.fn().mockResolvedValue({ jobId: 'job-1' }),
      retry: vi.fn().mockResolvedValue({ jobId: 'job-2' }),
      delete: vi.fn().mockResolvedValue({ deleted: true }),
    };
    const controller = new PublicationOwnerController(
      {} as never,
      {} as never,
      generationOwner as never,
    );
    return { controller, generationOwner };
  }

  it('delegates progress with the authenticated owner id', async () => {
    const { controller, generationOwner } = setup();
    await expect(controller.getGenerationProgress('pub-1', user)).resolves.toEqual({
      jobId: 'job-1',
    });
    expect(generationOwner.getProgress).toHaveBeenCalledWith('pub-1', 'owner-1');
  });

  it('delegates retry with the validated body', async () => {
    const { controller, generationOwner } = setup();
    const body = { idempotencyKey: 'retry-1' };
    await expect(controller.retryGeneration('pub-1', body, user)).resolves.toEqual({
      jobId: 'job-2',
    });
    expect(generationOwner.retry).toHaveBeenCalledWith('pub-1', 'owner-1', body);
  });

  it('delegates delete with the authenticated owner id', async () => {
    const { controller, generationOwner } = setup();
    await expect(controller.deletePublication('pub-1', user)).resolves.toEqual({ deleted: true });
    expect(generationOwner.delete).toHaveBeenCalledWith('pub-1', 'owner-1');
  });
});
