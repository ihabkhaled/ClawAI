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

describe('buildNotificationRowText for community kinds', () => {
  const t = (key: string, params?: Record<string, string | number>): string =>
    `${key}|${JSON.stringify(params ?? {})}`;

  it.each([
    UserNotificationKind.THREAD_COMMENTED,
    UserNotificationKind.THREAD_COMMENT_REPLIED,
    UserNotificationKind.THREAD_MENTIONED,
    UserNotificationKind.THREAD_REACTED,
    UserNotificationKind.THREAD_COMMENT_REACTED,
    UserNotificationKind.THREAD_CHANGE_REQUESTED,
  ])('passes the actor and excerpt to the %s text', (kind) => {
    const text = buildNotificationRowText(
      item({
        kind,
        params: { actorName: 'Ada', actorUsername: 'ada', title: 'T', excerpt: 'Nice work' },
      }),
      t,
      'en',
      NOW,
    );
    expect(text.kind).toBe(kind);
    expect(text.title).toContain(`notifications.kinds.${kind}.title`);
    expect(text.title).toContain('"actorName":"Ada"');
    expect(text.body).toContain('"excerpt":"Nice work"');
    expect(text.body).toContain('"actorUsername":"ada"');
  });

  it('never leaves a placeholder undefined when a param is missing', () => {
    const text = buildNotificationRowText(
      item({ kind: UserNotificationKind.THREAD_REACTED, params: {} }),
      t,
      'en',
      NOW,
    );
    expect(text.title).toContain('"actorName":""');
  });
});
