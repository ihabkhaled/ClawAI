import { UserNotificationKind } from '@claw/shared-types';

import {
  notificationListQuerySchema,
  notificationPreferencesSchema,
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
