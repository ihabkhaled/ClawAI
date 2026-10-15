import { UserNotificationKind } from '../user-notification-kind.enum';

describe('UserNotificationKind', () => {
  it('keeps the three Thread lifecycle kinds', () => {
    expect(UserNotificationKind.THREAD_READY_FOR_REVIEW).toBe('THREAD_READY_FOR_REVIEW');
    expect(UserNotificationKind.THREAD_PUBLISHED).toBe('THREAD_PUBLISHED');
    expect(UserNotificationKind.THREAD_FAILED).toBe('THREAD_FAILED');
  });

  it('adds the community kinds with values equal to their names', () => {
    for (const kind of [
      'THREAD_COMMENTED',
      'THREAD_COMMENT_REPLIED',
      'THREAD_MENTIONED',
      'THREAD_REACTED',
      'THREAD_COMMENT_REACTED',
      'THREAD_CHANGE_REQUESTED',
      'THREAD_CHANGE_ACCEPTED',
      'THREAD_CHANGE_APPLIED',
      'THREAD_CHANGE_DECLINED',
    ] as const) {
      expect(UserNotificationKind[kind]).toBe(kind);
    }
  });

  it('has exactly fourteen kinds, so a new one cannot slip in without a test and copy', () => {
    expect(Object.values(UserNotificationKind)).toHaveLength(14);
  });
});
