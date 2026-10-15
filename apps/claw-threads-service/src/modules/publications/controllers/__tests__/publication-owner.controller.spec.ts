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
    const community = {
      resolveOwnerChangeRequest: vi.fn().mockResolvedValue({ resolved: true, edit: null }),
    };
    const views = { listForOwner: vi.fn().mockResolvedValue([]) };
    const controller = new PublicationOwnerController(
      {} as never,
      community as never,
      views as never,
      generationOwner as never,
    );
    return { controller, generationOwner, community, views };
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

  it('lists suggestions for the signed-in owner only', async () => {
    const { controller, views } = setup();
    await controller.listChangeRequests('pub-1', user);
    expect(views.listForOwner).toHaveBeenCalledWith('pub-1', 'owner-1');
  });

  it('resolves a suggestion as the signed-in owner, never a body-supplied one', async () => {
    const { controller, community } = setup();
    await controller.resolveChangeRequest('pub-1', 'req-1', { status: 'REJECTED' }, user);
    expect(community.resolveOwnerChangeRequest).toHaveBeenCalledWith('pub-1', 'owner-1', 'req-1', {
      status: 'REJECTED',
    });
  });
});
