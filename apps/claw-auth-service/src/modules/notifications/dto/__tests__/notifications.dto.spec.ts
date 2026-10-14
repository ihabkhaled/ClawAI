import { UserNotificationKind } from '@claw/shared-types';

import {
  notificationListQuerySchema,
  notificationPreferencesSchema,
  pushSubscriptionSchema,
  userNotificationRequestedSchema,
} from '../notifications.dto';

const valid = {
  dedupeKey: 'k',
  userId: 'u',
  kind: UserNotificationKind.THREAD_FAILED,
  link: '/threads/review/abc',
  params: {},
};

describe('userNotificationRequestedSchema', () => {
  it('accepts every community kind with a comment anchor link and the four params', () => {
    for (const kind of [
      UserNotificationKind.THREAD_COMMENTED,
      UserNotificationKind.THREAD_COMMENT_REPLIED,
      UserNotificationKind.THREAD_MENTIONED,
      UserNotificationKind.THREAD_REACTED,
      UserNotificationKind.THREAD_COMMENT_REACTED,
      UserNotificationKind.THREAD_CHANGE_REQUESTED,
    ]) {
      const parsed = userNotificationRequestedSchema.safeParse({
        ...valid,
        kind,
        link: '/threads/my-slug#comment-abc123',
        params: { actorName: 'Ada', actorUsername: 'ada', title: 'T', excerpt: 'مرحبا بك' },
      });
      expect(parsed.success).toBe(true);
    }
  });

  it('accepts a portal path with a query string', () => {
    expect(
      userNotificationRequestedSchema.safeParse({ ...valid, link: '/threads?x=1#a' }).success,
    ).toBe(true);
  });

  it.each(['threads', 'https://x.test', '//x.test', '/a b', '/a\\b', '/javascript:alert(1)'])(
    'rejects the link %s',
    (link) => {
      expect(userNotificationRequestedSchema.safeParse({ ...valid, link }).success).toBe(false);
    },
  );

  it('rejects too many or too long params and non-string values', () => {
    const many = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`k${index}`, 'v']));
    expect(userNotificationRequestedSchema.safeParse({ ...valid, params: many }).success).toBe(
      false,
    );
    expect(
      userNotificationRequestedSchema.safeParse({ ...valid, params: { a: 'x'.repeat(201) } })
        .success,
    ).toBe(false);
    expect(userNotificationRequestedSchema.safeParse({ ...valid, params: { a: 1 } }).success).toBe(
      false,
    );
  });
});

describe('notificationListQuerySchema', () => {
  it('defaults and caps the page size', () => {
    expect(notificationListQuerySchema.parse({}).limit).toBe(20);
    expect(notificationListQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
    expect(notificationListQuerySchema.parse({ limit: '5' }).limit).toBe(5);
  });
});

describe('notificationPreferencesSchema', () => {
  it('needs at least one known boolean channel', () => {
    expect(notificationPreferencesSchema.safeParse({}).success).toBe(false);
    expect(notificationPreferencesSchema.safeParse({ emailEnabled: false }).success).toBe(true);
    expect(notificationPreferencesSchema.safeParse({ smsEnabled: true }).success).toBe(false);
    expect(notificationPreferencesSchema.safeParse({ emailEnabled: 'no' }).success).toBe(false);
  });
});

describe('pushSubscriptionSchema', () => {
  const validSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    keys: { p256dh: 'p', auth: 'a' },
  };

  it('accepts a browser subscription', () => {
    expect(pushSubscriptionSchema.safeParse(validSubscription).success).toBe(true);
  });

  it('rejects an endpoint that is not a browser push service', () => {
    for (const endpoint of [
      'https://127.0.0.1/x',
      'https://auth-service:4001/x',
      'https://evil.example/x',
    ]) {
      expect(pushSubscriptionSchema.safeParse({ ...validSubscription, endpoint }).success).toBe(
        false,
      );
    }
  });

  it('rejects a non-https endpoint, extra fields and missing keys', () => {
    expect(
      pushSubscriptionSchema.safeParse({
        ...validSubscription,
        endpoint: 'http://push.example.test/a',
      }).success,
    ).toBe(false);
    expect(
      pushSubscriptionSchema.safeParse({ ...validSubscription, userId: 'someone' }).success,
    ).toBe(false);
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: validSubscription.endpoint,
        keys: { p256dh: 'p' },
      }).success,
    ).toBe(false);
  });
});
