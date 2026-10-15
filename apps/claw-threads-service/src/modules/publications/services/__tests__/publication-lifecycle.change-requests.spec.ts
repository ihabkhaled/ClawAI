import { GenerationStartGate } from '../generation-start-gate.service';
import { PublicationLifecycleService } from '../publication-lifecycle.service';

const article = { id: 'pub-1', slug: 'a-slug' };

function build(markApplied: () => Promise<string[]>) {
  const publications = {
    publishReadyRevision: vi
      .fn()
      .mockResolvedValue({ kind: 'PUBLISHED', publication: article, newlyPublished: false }),
  };
  const changeRequests = { markAcceptedApplied: vi.fn(markApplied) };
  const communityNotices = { changesApplied: vi.fn().mockResolvedValue(undefined) };
  const service = new PublicationLifecycleService(
    publications as never,
    {} as never,
    { notifyPublished: vi.fn().mockResolvedValue(undefined) } as never,
    new GenerationStartGate(),
    { syncPublication: vi.fn().mockResolvedValue(true) } as never,
    undefined,
    undefined,
    changeRequests as never,
    communityNotices as never,
  );
  return { service, changeRequests, communityNotices };
}

describe('PublicationLifecycleService applies accepted suggestions on publish', () => {
  it('marks accepted suggestions applied and tells their requesters once', async () => {
    const { service, changeRequests, communityNotices } = build(() =>
      Promise.resolve(['req-1', 'req-2']),
    );

    await expect(service.approveAndPublish('pub-1', 'owner-1')).resolves.toBe(article);

    expect(changeRequests.markAcceptedApplied).toHaveBeenCalledWith('pub-1');
    expect(communityNotices.changesApplied).toHaveBeenCalledWith(['req-1', 'req-2']);
  });

  it('tells nobody when no accepted suggestion became applied', async () => {
    const { service, communityNotices } = build(() => Promise.resolve([]));
    await service.approveAndPublish('pub-1', 'owner-1');
    expect(communityNotices.changesApplied).not.toHaveBeenCalled();
  });

  it('still answers the publish when recording the applied suggestions fails', async () => {
    const { service, communityNotices } = build(() => Promise.reject(new Error('db down')));
    await expect(service.approveAndPublish('pub-1', 'owner-1')).resolves.toBe(article);
    expect(communityNotices.changesApplied).not.toHaveBeenCalled();
  });
});
