import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNotificationBell } from '@/hooks/notifications/use-notification-bell';
import { useAuthStore } from '@/stores/auth.store';
import type { NotificationItem, NotificationPage } from '@/types/notifications.types';

const list = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}));
vi.mock('@/repositories/notifications/notifications.repository', () => ({
  notificationsRepository: {
    list: (...args: unknown[]) => list(...args),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

function item(id: string): NotificationItem {
  return {
    id,
    kind: 'THREAD_PUBLISHED' as NotificationItem['kind'],
    link: '/threads',
    params: {},
    readAt: null,
    createdAt: '2026-10-31T10:00:00.000Z',
  };
}

function page(items: NotificationItem[], unreadCount: number): NotificationPage {
  return { items, nextCursor: null, unreadCount };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useNotificationBell list freshness', () => {
  beforeEach(() => {
    list.mockReset();
    useAuthStore.setState({ isAuthenticated: true });
  });
  afterEach(() => vi.useRealTimers());

  it('fetches the list fresh every time the panel opens', async () => {
    list.mockResolvedValue(page([item('n1')], 1));
    const { result } = renderHook(() => useNotificationBell(), { wrapper });
    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    act(() => result.current.setOpen(true));
    await waitFor(() => expect(result.current.items.map((row) => row.id)).toEqual(['n1']));

    // A newer notification exists the next time the panel opens.
    list.mockResolvedValue(page([item('n2'), item('n1')], 2));
    act(() => result.current.setOpen(false));
    act(() => result.current.setOpen(true));
    await waitFor(() => expect(result.current.items.map((row) => row.id)).toEqual(['n2', 'n1']));
  });

  it('refreshes the open list when the badge poll sees a new notification', async () => {
    list.mockResolvedValue(page([item('n1')], 1));
    const { result } = renderHook(() => useNotificationBell(), { wrapper });
    await waitFor(() => expect(result.current.unreadCount).toBe(1));
    act(() => result.current.setOpen(true));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    list.mockImplementation(() => Promise.resolve(page([item('n2'), item('n1')], 2)));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(result.current.items.map((row) => row.id)).toEqual(['n2', 'n1']));
    expect(result.current.unreadCount).toBe(2);
  });

  it('does not fetch the list while the panel is closed', async () => {
    list.mockResolvedValue(page([item('n1')], 1));
    const { result } = renderHook(() => useNotificationBell(), { wrapper });
    await waitFor(() => expect(result.current.unreadCount).toBe(1));
    // Only the one-row badge request ran.
    expect(list.mock.calls.every((call) => call[1] === 1)).toBe(true);
  });
});
