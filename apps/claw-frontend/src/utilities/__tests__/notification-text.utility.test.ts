import { UserNotificationKind } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import type { NotificationItem } from '@/types/notifications.types';
import {
  buildNotificationRowText,
  formatNotificationTime,
} from '@/utilities/notification-text.utility';

const NOW = Date.parse('2026-10-08T12:00:00Z');

function item(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 'n1',
    kind: UserNotificationKind.THREAD_PUBLISHED,
    link: '/threads/x',
    params: { title: 'My Thread' },
    readAt: null,
    createdAt: '2026-10-08T11:58:00Z',
    ...overrides,
  };
}

describe('formatNotificationTime', () => {
  it('reads recent times relative to now', () => {
    expect(formatNotificationTime('2026-10-08T11:58:00Z', 'en', NOW)).toBe('2 minutes ago');
    expect(formatNotificationTime('2026-10-08T09:00:00Z', 'en', NOW)).toBe('3 hours ago');
    expect(formatNotificationTime('2026-10-06T12:00:00Z', 'en', NOW)).toBe('2 days ago');
  });

  it('says "now" for the last seconds and never claims a future time', () => {
    expect(formatNotificationTime('2026-10-08T12:00:20Z', 'en', NOW)).toBe('now');
  });

  it('falls back to a date after a month', () => {
    expect(formatNotificationTime('2026-08-01T12:00:00Z', 'en', NOW)).toMatch(/2026/u);
  });

  it('is empty for something that is not a date', () => {
    expect(formatNotificationTime('not a date', 'en', NOW)).toBe('');
  });
});

describe('buildNotificationRowText', () => {
  const t = (key: string): string => `T(${key})`;

  it('looks up the kind’s words and carries the Thread title', () => {
    const text = buildNotificationRowText(item(), t, 'en', NOW);
    expect(text.title).toBe('T(notifications.kinds.THREAD_PUBLISHED.title)');
    expect(text.body).toBe('T(notifications.kinds.THREAD_PUBLISHED.body)');
    expect(text.subject).toBe('My Thread');
    expect(text.when).toBe('2 minutes ago');
  });

  it('has no subject when there is no title', () => {
    expect(buildNotificationRowText(item({ params: {} }), t, 'en', NOW).subject).toBeNull();
    expect(
      buildNotificationRowText(item({ params: { title: '' } }), t, 'en', NOW).subject,
    ).toBeNull();
  });
});
