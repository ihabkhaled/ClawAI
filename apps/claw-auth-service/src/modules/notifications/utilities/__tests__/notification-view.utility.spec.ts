import { UserNotificationKind } from '@claw/shared-types';

import {
  isNotificationKind,
  toNotificationView,
  toStringParams,
} from '../notification-view.utility';

describe('toStringParams', () => {
  it('keeps only string values and tolerates anything else', () => {
    expect(toStringParams({ a: 'x', b: 1, c: null, d: {} })).toEqual({ a: 'x' });
    expect(toStringParams(null)).toEqual({});
    expect(toStringParams(['x'])).toEqual({});
    expect(toStringParams('x')).toEqual({});
  });
});

describe('toNotificationView', () => {
  const base = {
    id: 'n1',
    kind: UserNotificationKind.THREAD_PUBLISHED,
    link: '/threads/x',
    params: { title: 'T' },
    readAt: null,
    createdAt: new Date('2026-10-08T10:00:00Z'),
  };

  it('shapes a row with ISO dates', () => {
    expect(toNotificationView(base)).toEqual({
      ...base,
      readAt: null,
      createdAt: '2026-10-08T10:00:00.000Z',
    });
    expect(toNotificationView({ ...base, readAt: new Date('2026-10-08T11:00:00Z') })?.readAt).toBe(
      '2026-10-08T11:00:00.000Z',
    );
  });

  it('drops a row of an unknown kind', () => {
    expect(toNotificationView({ ...base, kind: 'NEWER_KIND' })).toBeNull();
    expect(isNotificationKind('NEWER_KIND')).toBe(false);
    expect(isNotificationKind(UserNotificationKind.THREAD_FAILED)).toBe(true);
  });
});

describe('community notification kinds', () => {
  it('knows every Threads community kind and keeps their params', () => {
    for (const kind of [
      UserNotificationKind.THREAD_COMMENTED,
      UserNotificationKind.THREAD_COMMENT_REPLIED,
      UserNotificationKind.THREAD_MENTIONED,
      UserNotificationKind.THREAD_REACTED,
      UserNotificationKind.THREAD_COMMENT_REACTED,
      UserNotificationKind.THREAD_CHANGE_REQUESTED,
      UserNotificationKind.THREAD_CHANGE_ACCEPTED,
      UserNotificationKind.THREAD_CHANGE_APPLIED,
      UserNotificationKind.THREAD_CHANGE_DECLINED,
    ]) {
      expect(isNotificationKind(kind)).toBe(true);
    }
    const view = toNotificationView({
      id: 'n1',
      kind: UserNotificationKind.THREAD_COMMENT_REPLIED,
      link: '/threads/a#comment-c1',
      params: { actorName: 'Ada', actorUsername: 'ada', title: 'T', excerpt: 'مرحبا' },
      readAt: null,
      createdAt: new Date('2026-10-14T00:00:00Z'),
    } as never);
    expect(view?.params).toEqual({
      actorName: 'Ada',
      actorUsername: 'ada',
      title: 'T',
      excerpt: 'مرحبا',
    });
  });
});
