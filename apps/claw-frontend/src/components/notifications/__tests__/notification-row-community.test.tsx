import { UserNotificationKind } from '@claw/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NotificationItem } from '@/types/notifications.types';
import { buildNotificationRowText } from '@/utilities/notification-text.utility';

import { NotificationRow } from '../notification-row';

const T = (key: string, params?: Record<string, string | number>): string =>
  params ? `${key}:${String(params['actorName'])}:${String(params['excerpt'])}` : key;

function item(kind: UserNotificationKind): NotificationItem {
  return {
    id: 'n1',
    kind,
    link: '/threads/x#comment-c1',
    params: {
      actorName: 'Ada',
      actorUsername: 'ada',
      title: 'My Thread',
      excerpt: 'Nice <b>x</b>',
    },
    readAt: null,
    createdAt: '2026-10-08T11:58:00Z',
  };
}

describe('NotificationRow for community kinds', () => {
  it.each([
    UserNotificationKind.THREAD_COMMENTED,
    UserNotificationKind.THREAD_COMMENT_REPLIED,
    UserNotificationKind.THREAD_MENTIONED,
    UserNotificationKind.THREAD_REACTED,
    UserNotificationKind.THREAD_COMMENT_REACTED,
    UserNotificationKind.THREAD_CHANGE_REQUESTED,
  ])('renders %s with an icon, the actor and the excerpt as plain text', (kind) => {
    const notification = item(kind);
    const onSelect = vi.fn();
    const { container } = render(
      <NotificationRow
        item={notification}
        text={buildNotificationRowText(notification, T, 'en', Date.parse('2026-10-08T12:00:00Z'))}
        onSelect={onSelect}
      />,
    );

    expect(
      screen.getByText(`notifications.kinds.${kind}.title:Ada:Nice <b>x</b>`),
    ).toBeInTheDocument();
    expect(screen.getByText('My Thread')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });
});
