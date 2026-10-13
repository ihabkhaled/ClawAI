import { NotFoundException } from '@nestjs/common';

import { GenerationStartGate } from '../generation-start-gate.service';
import { PublicationLifecycleService } from '../publication-lifecycle.service';

const publication = { id: 'pub-1', slug: 'a-slug' };

function build(overrides: { sync?: () => Promise<boolean>; remove?: () => Promise<void> } = {}) {
  const repository = {
    publishReadyRevision: vi
      .fn()
      .mockResolvedValue({ kind: 'PUBLISHED', publication, newlyPublished: false }),
    unpublishOwned: vi.fn().mockResolvedValue(true),
    createEditedRevision: vi.fn().mockResolvedValue({
      id: 'rev-2',
      editInProgress: false,
      requestMatches: true,
      revalidationJobId: null,
      generationJobId: 'job-1',
    }),
  };
  const boardIndex = {
    syncPublication: vi.fn(overrides.sync ?? (() => Promise.resolve(true))),
    removePublication: vi.fn(overrides.remove ?? (() => Promise.resolve())),
  };
  const notifications = { notifyPublished: vi.fn().mockResolvedValue(undefined) };
  const generation = {
    enqueueRevisionReview: vi.fn().mockResolvedValue({ jobId: 'rj', status: 'QUEUED' }),
  };
  const service = new PublicationLifecycleService(
    repository as never,
    generation as never,
    notifications as never,
    new GenerationStartGate(),
    boardIndex as never,
  );
  return { service, repository, boardIndex };
}

describe('PublicationLifecycleService Board index sync', () => {
  it('syncs the Board row after a publish, also when the article was already live', async () => {
    const { service, boardIndex } = build();

    await service.approveAndPublish('pub-1', 'owner-1');

    expect(boardIndex.syncPublication).toHaveBeenCalledWith('pub-1');
  });

  it('removes the Board row after an unpublish, and syncs again on a republish', async () => {
    const { service, boardIndex } = build();

    await service.unpublish('pub-1', 'owner-1');
    await service.approveAndPublish('pub-1', 'owner-1');

    expect(boardIndex.removePublication).toHaveBeenCalledWith('pub-1');
    expect(boardIndex.syncPublication).toHaveBeenCalledTimes(1);
  });

  it('does not touch the Board when the caller does not own the publication', async () => {
    const { service, repository, boardIndex } = build();
    repository.unpublishOwned.mockResolvedValue(false);

    await expect(service.unpublish('pub-1', 'owner-2')).rejects.toBeInstanceOf(NotFoundException);
    expect(boardIndex.removePublication).not.toHaveBeenCalled();
  });

  it('never fails the request when the Board index is down', async () => {
    const down = () => Promise.reject(new Error('db down'));
    const { service } = build({ sync: down, remove: down });

    await expect(service.approveAndPublish('pub-1', 'owner-1')).resolves.toEqual(publication);
    await expect(service.unpublish('pub-1', 'owner-1')).resolves.toEqual({ unpublished: true });
  });

  it('works without a Board index bound', async () => {
    const service = new PublicationLifecycleService(
      { unpublishOwned: vi.fn().mockResolvedValue(true) } as never,
      {} as never,
      {} as never,
      new GenerationStartGate(),
    );

    await expect(service.unpublish('pub-1', 'owner-1')).resolves.toEqual({ unpublished: true });
  });
});
