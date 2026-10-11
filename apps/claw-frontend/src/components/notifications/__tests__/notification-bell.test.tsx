import { UserNotificationKind } from '@claw/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationBell } from '@/components/notifications/notification-bell';
import { useAuthStore } from '@/stores/auth.store';

const push = vi.fn();
const list = vi.fn();
const markRead = vi.fn();
const markAllRead = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}));
vi.mock('@/repositories/notifications/notifications.repository', () => ({
  notificationsRepository: {
    list: (...args: unknown[]) => list(...args),
    markRead: (...args: unknown[]) => markRead(...args),
    markAllRead: (...args: unknown[]) => markAllRead(...args),
  },
}));

function row(id: string, readAt: string | null) {
  return {
    id,
    kind: UserNotificationKind.THREAD_READY_FOR_REVIEW,
    link: `/threads/review/${id}`,
    params: {},
    readAt,
    createdAt: '2026-10-08T11:00:00Z',
  };
}

function renderBell(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <NotificationBell />
    </QueryClientProvider>,
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
    list.mockImplementation(async (_cursor: string | null, limit: number) =>
      limit === 1
        ? { items: [], nextCursor: null, unreadCount: 3 }
        : {
            items: [row('a', null), row('b', '2026-10-08T11:30:00Z')],
            nextCursor: null,
            unreadCount: 3,
          },
    );
    markRead.mockResolvedValue({ unreadCount: 2 });
    markAllRead.mockResolvedValue({ unreadCount: 0 });
  });

  it('shows the unread count on the bell and in its label', async () => {
    renderBell();
    const badge = await screen.findByTestId('notification-badge');
    expect(badge.textContent).toBe('3');
    expect(screen.getByTestId('notification-bell').getAttribute('aria-label')).toContain('3');
  });

  it('shows 99+ for a very large count and no badge at zero', async () => {
    list.mockImplementation(async () => ({ items: [], nextCursor: null, unreadCount: 250 }));
    renderBell();
    expect((await screen.findByTestId('notification-badge')).textContent).toBe('99+');
  });

  it('does not fetch the list until the panel is opened', async () => {
    renderBell();
    await screen.findByTestId('notification-badge');
    expect(list.mock.calls.every((call) => call[1] === 1)).toBe(true);
    fireEvent.click(screen.getByTestId('notification-bell'));
    await screen.findAllByTestId('notification-row');
    expect(list.mock.calls.some((call) => call[1] === 20)).toBe(true);
  });

  it('marks an unread row read and goes to its page', async () => {
    renderBell();
    fireEvent.click(await screen.findByTestId('notification-bell'));
    const rows = await screen.findAllByTestId('notification-row');
    expect(rows[0]?.getAttribute('data-unread')).toBe('true');
    expect(rows[1]?.getAttribute('data-unread')).toBe('false');
    fireEvent.click(rows[0] as HTMLElement);
    await waitFor(() => expect(markRead).toHaveBeenCalledWith('a'));
    expect(push).toHaveBeenCalledWith('/en/threads/review/a');
  });

  it('does not mark an already-read row again but still opens it', async () => {
    renderBell();
    fireEvent.click(await screen.findByTestId('notification-bell'));
    const rows = await screen.findAllByTestId('notification-row');
    fireEvent.click(rows[1] as HTMLElement);
    expect(markRead).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/en/threads/review/b');
  });

  it('marks everything read from the panel header', async () => {
    renderBell();
    fireEvent.click(await screen.findByTestId('notification-bell'));
    await screen.findAllByTestId('notification-row');
    fireEvent.click(screen.getByText('notifications.markAllRead'));
    await waitFor(() => expect(markAllRead).toHaveBeenCalledOnce());
  });

  it('says so when there is nothing yet, and offers a retry on error', async () => {
    list.mockImplementation(async (_cursor: string | null, limit: number) => ({
      items: [],
      nextCursor: null,
      unreadCount: limit === 1 ? 0 : 0,
    }));
    renderBell();
    fireEvent.click(await screen.findByTestId('notification-bell'));
    expect(await screen.findByText('notifications.empty')).toBeTruthy();
  });

  it('shows an error with a retry button when the list cannot load', async () => {
    list.mockImplementation(async (_cursor: string | null, limit: number) => {
      if (limit === 1) {
        return { items: [], nextCursor: null, unreadCount: 0 };
      }
      throw new Error('boom');
    });
    renderBell();
    fireEvent.click(await screen.findByTestId('notification-bell'));
    expect(await screen.findByText('notifications.error', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText('notifications.retry')).toBeTruthy();
  });
});
