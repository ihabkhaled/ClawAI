import { EventPattern, UserNotificationKind } from '@claw/shared-types';

import { ThreadNotificationService } from '../thread-notification.service';

function build(target: { id: string; ownerId: string; slug: string } | null) {
  const publications = { findByGenerationJobId: vi.fn().mockResolvedValue(target) };
  const rabbit = { publishConfirmed: vi.fn().mockResolvedValue(undefined) };
  const service = new ThreadNotificationService(publications as never, rabbit as never);
  return { service, publications, rabbit };
}

const target = { id: 'pub_1', ownerId: 'owner-1', slug: 'my-slug' };

function published(title: string, publishedAt: Date) {
  return { id: 'pub_1', slug: 'my-slug', title, content: { markdown: '# x' }, publishedAt };
}

describe('ThreadNotificationService', () => {
  it('asks for a ready notice with the review link', async () => {
    const { service, rabbit } = build(target);
    await service.notifyReady('job-1', 'owner-1');
    expect(rabbit.publishConfirmed).toHaveBeenCalledExactlyOnceWith(
      EventPattern.USER_NOTIFICATION_REQUESTED,
      {
        dedupeKey: 'thread-ready:job-1',
        userId: 'owner-1',
        kind: UserNotificationKind.THREAD_READY_FOR_REVIEW,
        link: '/threads/review/pub_1',
        params: {},
      },
    );
  });

  it('sends nothing for a job whose publication belongs to someone else', async () => {
    const { service, rabbit } = build({ ...target, ownerId: 'other' });
    await service.notifyReady('job-1', 'owner-1');
    expect(rabbit.publishConfirmed).not.toHaveBeenCalled();
  });

  it('sends nothing for an unknown job', async () => {
    const { service, rabbit } = build(null);
    await service.notifyReady('job-x', 'owner-1');
    expect(rabbit.publishConfirmed).not.toHaveBeenCalled();
  });

  it('tells the owner about a failure and links the review page', async () => {
    const { service, rabbit } = build(target);
    await service.notifyFailed('job-1', 'owner-1');
    expect(rabbit.publishConfirmed.mock.calls[0]?.[1]).toMatchObject({
      dedupeKey: 'thread-failed:job-1',
      kind: UserNotificationKind.THREAD_FAILED,
      link: '/threads/review/pub_1',
    });
  });

  it('still tells the owner about a failure when no publication is found', async () => {
    const { service, rabbit } = build(null);
    await service.notifyFailed('job-1', 'owner-1');
    expect(rabbit.publishConfirmed.mock.calls[0]?.[1]).toMatchObject({ link: '/threads' });
  });

  it('announces a publication with its title and a key that changes on re-publish', async () => {
    const { service, rabbit } = build(target);
    await service.notifyPublished('owner-1', published('  A   title ', new Date('2026-10-08')));
    await service.notifyPublished('owner-1', published('A title', new Date('2026-10-09')));
    const first = rabbit.publishConfirmed.mock.calls[0]?.[1];
    const second = rabbit.publishConfirmed.mock.calls[1]?.[1];
    expect(first).toMatchObject({
      kind: UserNotificationKind.THREAD_PUBLISHED,
      link: '/threads/my-slug',
      params: { title: 'A title' },
    });
    expect(first.dedupeKey).not.toBe(second.dedupeKey);
  });

  it('lets a broker failure surface so the caller can retry', async () => {
    const { service, rabbit } = build(target);
    rabbit.publishConfirmed.mockRejectedValue(new Error('down'));
    await expect(service.notifyReady('job-1', 'owner-1')).rejects.toThrow('down');
  });
});
