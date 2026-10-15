import { UserNotificationKind } from '@claw/shared-types';

import { ChangeRequestDecision } from '../../../../common/enums/change-request-decision.enum';
import { CommunityNotificationService } from '../community-notification.service';

const publication = { id: 'pub-1', slug: 'my-thread', ownerId: 'owner', title: 'My Thread' };

function create() {
  const identity = {
    resolveOne: vi.fn().mockResolvedValue({ username: 'ada', displayName: 'Ada Lovelace' }),
  };
  const notifications = { dispatchBestEffort: vi.fn().mockResolvedValue(undefined) };
  const comments = { findPublicationTarget: vi.fn().mockResolvedValue(publication) };
  const requests = { findDecisionContext: vi.fn().mockResolvedValue(null) };
  const service = new CommunityNotificationService(
    identity as never,
    notifications as never,
    comments as never,
    requests as never,
  );
  return { service, identity, notifications, comments, requests };
}

describe('CommunityNotificationService', () => {
  it('sends the planned comment notices with the actor display name', async () => {
    const { service, notifications } = create();
    await service.commentCreated({
      actorId: 'actor',
      publication,
      commentId: 'c1',
      content: 'Nice',
      replyToAuthorId: 'bob',
      mentionedUserIds: ['carol'],
    });
    const payloads = notifications.dispatchBestEffort.mock.calls[0]?.[0] as Array<{
      userId: string;
      kind: string;
      params: Record<string, string>;
    }>;
    expect(payloads.map(({ userId, kind }) => `${userId}:${kind}`)).toEqual([
      'bob:THREAD_COMMENT_REPLIED',
      'owner:THREAD_COMMENTED',
      'carol:THREAD_MENTIONED',
    ]);
    expect(payloads[0]?.params).toMatchObject({ actorName: 'Ada Lovelace', actorUsername: 'ada' });
  });

  it('falls back to an empty name when auth-service is unreachable and still notifies', async () => {
    const { service, identity, notifications } = create();
    identity.resolveOne.mockResolvedValue(null);
    await service.commentCreated({
      actorId: 'actor',
      publication,
      commentId: 'c1',
      content: 'Nice',
      replyToAuthorId: null,
      mentionedUserIds: [],
    });
    const [payload] = notifications.dispatchBestEffort.mock.calls[0]?.[0] as Array<{
      params: Record<string, string>;
    }>;
    expect(payload?.params).toMatchObject({ actorName: '', actorUsername: '' });
  });

  it('never throws when planning or sending fails', async () => {
    const { service, identity, notifications } = create();
    identity.resolveOne.mockRejectedValue(new Error('boom'));
    await expect(
      service.commentCreated({
        actorId: 'a',
        publication,
        commentId: 'c',
        content: 'x',
        replyToAuthorId: null,
        mentionedUserIds: [],
      }),
    ).resolves.toBeUndefined();
    identity.resolveOne.mockResolvedValue(null);
    notifications.dispatchBestEffort.mockRejectedValue(new Error('broker down'));
    await expect(
      service.commentCreated({
        actorId: 'a',
        publication,
        commentId: 'c',
        content: 'x',
        replyToAuthorId: null,
        mentionedUserIds: [],
      }),
    ).resolves.toBeUndefined();
  });

  it('sends nothing for a self action', async () => {
    const { service, notifications } = create();
    await service.commentCreated({
      actorId: 'owner',
      publication,
      commentId: 'c1',
      content: 'x',
      replyToAuthorId: null,
      mentionedUserIds: [],
    });
    await service.threadReacted('my-thread', 'owner', 'LIKE', null);
    await service.changeRequested('my-thread', 'owner', 'req-1', 's');
    expect(notifications.dispatchBestEffort).not.toHaveBeenCalled();
  });

  it('notifies the owner of a Thread like once and skips a dislike after a reaction', async () => {
    const { service, notifications } = create();
    await service.threadReacted('my-thread', 'actor', 'LIKE', null);
    expect(notifications.dispatchBestEffort).toHaveBeenCalledTimes(1);
    const [payload] = notifications.dispatchBestEffort.mock.calls[0]?.[0] as Array<{
      kind: string;
      dedupeKey: string;
    }>;
    expect(payload).toMatchObject({
      kind: UserNotificationKind.THREAD_REACTED,
      dedupeKey: 'thread-reacted:pub-1:actor',
    });
    await service.threadReacted('my-thread', 'actor', 'DISLIKE', 'LIKE');
    expect(notifications.dispatchBestEffort).toHaveBeenCalledTimes(1);
  });

  it('notifies the comment author of a like only', async () => {
    const { service, notifications } = create();
    const outcome = {
      summary: { likes: 1, dislikes: 0, viewerReaction: 'LIKE' as const },
      publication,
      comment: { id: 'c1', authorId: 'bob', content: 'Nice' },
    };
    await service.commentReacted(outcome, 'actor', 'LIKE');
    expect(notifications.dispatchBestEffort).toHaveBeenCalledTimes(1);
    await service.commentReacted(outcome, 'actor', 'DISLIKE');
    await service.commentReacted(outcome, 'bob', 'LIKE');
    expect(notifications.dispatchBestEffort).toHaveBeenCalledTimes(1);
  });

  it('notifies the owner of a change request', async () => {
    const { service, notifications, comments } = create();
    await service.changeRequested('my-thread', 'actor', 'req-1', 'Add a source');
    expect(comments.findPublicationTarget).toHaveBeenCalledWith('my-thread');
    expect(notifications.dispatchBestEffort.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        kind: UserNotificationKind.THREAD_CHANGE_REQUESTED,
        dedupeKey: 'change-requested:req-1',
        userId: 'owner',
      }),
    ]);
  });

  describe('suggestion decisions', () => {
    const context = {
      requestId: 'req-1',
      requesterId: 'asker',
      suggestion: 'Add a section on chlorophyll',
      status: 'ACCEPTED',
      publication: { id: 'pub-1', slug: 'my-thread', ownerId: 'owner', title: 'Plants' },
    };

    it('tells the requester an accepted suggestion was accepted, with the real title', async () => {
      const { service, notifications, requests } = create();
      requests.findDecisionContext.mockResolvedValue(context);
      await service.changeDecided('req-1', ChangeRequestDecision.ACCEPTED);
      expect(notifications.dispatchBestEffort).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 'asker',
          kind: UserNotificationKind.THREAD_CHANGE_ACCEPTED,
          dedupeKey: 'change-accepted:req-1',
          link: '/threads/my/suggestions#change-request-req-1',
          params: expect.objectContaining({ title: 'Plants', actorUsername: 'ada' }),
        }),
      ]);
    });

    it('tells the requester a declined suggestion was declined', async () => {
      const { service, notifications, requests } = create();
      requests.findDecisionContext.mockResolvedValue({ ...context, status: 'REJECTED' });
      await service.changeDecided('req-1', ChangeRequestDecision.DECLINED);
      expect(notifications.dispatchBestEffort.mock.calls[0]?.[0][0]).toMatchObject({
        kind: UserNotificationKind.THREAD_CHANGE_DECLINED,
        dedupeKey: 'change-declined:req-1',
      });
    });

    it('tells each requester once when suggestions are applied, linking the public Thread', async () => {
      const { service, notifications, requests } = create();
      requests.findDecisionContext
        .mockResolvedValueOnce(context)
        .mockResolvedValueOnce({ ...context, requestId: 'req-2', requesterId: 'other' });
      await service.changesApplied(['req-1', 'req-2']);
      const payloads = notifications.dispatchBestEffort.mock.calls[0]?.[0] as Array<{
        userId: string;
        kind: string;
        link: string;
        dedupeKey: string;
      }>;
      expect(payloads.map((payload) => payload.dedupeKey)).toEqual([
        'change-applied:req-1',
        'change-applied:req-2',
      ]);
      expect(payloads[0]).toMatchObject({
        kind: UserNotificationKind.THREAD_CHANGE_APPLIED,
        link: '/threads/my-thread',
      });
    });

    it('sends nothing when the request or its requester is gone, and never throws', async () => {
      const { service, notifications, requests } = create();
      requests.findDecisionContext.mockResolvedValueOnce(null);
      await service.changeDecided('missing', ChangeRequestDecision.ACCEPTED);
      requests.findDecisionContext.mockResolvedValueOnce({ ...context, requesterId: null });
      await service.changeDecided('req-1', ChangeRequestDecision.ACCEPTED);
      requests.findDecisionContext.mockRejectedValueOnce(new Error('db down'));
      await expect(
        service.changeDecided('req-1', ChangeRequestDecision.DECLINED),
      ).resolves.toBeUndefined();
      expect(notifications.dispatchBestEffort).not.toHaveBeenCalled();
    });
  });
});
