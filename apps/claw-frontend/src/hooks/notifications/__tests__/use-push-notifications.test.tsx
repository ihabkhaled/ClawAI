import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePushNotifications } from '@/hooks/notifications/use-push-notifications';
import { useAuthStore } from '@/stores/auth.store';

const getPushConfig = vi.fn();
const subscribePush = vi.fn();
const unsubscribePush = vi.fn();
const toast = vi.fn();

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/repositories/notifications/notifications.repository', () => ({
  notificationsRepository: {
    getPushConfig: (...args: unknown[]) => getPushConfig(...args),
    subscribePush: (...args: unknown[]) => subscribePush(...args),
    unsubscribePush: (...args: unknown[]) => unsubscribePush(...args),
  },
}));

const browserSubscription = {
  endpoint: 'https://push.example/abc',
  toJSON: () => ({ endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

function installBrowser(options: { subscribed: boolean; permission: NotificationPermission }) {
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(options.subscribed ? browserSubscription : null),
    subscribe: vi.fn().mockResolvedValue(browserSubscription),
  };
  vi.stubGlobal('PushManager', class {});
  vi.stubGlobal(
    'Notification',
    Object.assign(class {}, {
      permission: options.permission,
      requestPermission: vi.fn().mockResolvedValue('granted'),
    }),
  );
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve({ pushManager }) },
    configurable: true,
  });
  return pushManager;
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    useAuthStore.setState({ isAuthenticated: true });
    getPushConfig.mockResolvedValue({ enabled: true, publicKey: 'BBBB' });
    subscribePush.mockResolvedValue(undefined);
    unsubscribePush.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('is unavailable where the browser has no push API', () => {
    const { result } = renderHook(() => usePushNotifications(), { wrapper });
    expect(result.current.isAvailable).toBe(false);
    expect(getPushConfig).not.toHaveBeenCalled();
  });

  it('is unavailable when the server has no VAPID keys', async () => {
    installBrowser({ subscribed: false, permission: 'default' });
    getPushConfig.mockResolvedValue({ enabled: false, publicKey: null });
    const { result } = renderHook(() => usePushNotifications(), { wrapper });
    await waitFor(() => expect(getPushConfig).toHaveBeenCalled());
    expect(result.current.isAvailable).toBe(false);
  });

  it('subscribes the browser and tells the server when turned on', async () => {
    const pushManager = installBrowser({ subscribed: false, permission: 'default' });
    const { result } = renderHook(() => usePushNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isAvailable).toBe(true));
    act(() => result.current.toggle(true));
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));
    expect(pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(subscribePush).toHaveBeenCalledWith({
      endpoint: 'https://push.example/abc',
      keys: { p256dh: 'p', auth: 'a' },
    });
  });

  it('undoes the browser subscription and says so when the server refuses it', async () => {
    installBrowser({ subscribed: false, permission: 'default' });
    subscribePush.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => usePushNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isAvailable).toBe(true));
    act(() => result.current.toggle(true));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(browserSubscription.unsubscribe).toHaveBeenCalled();
    expect(result.current.isSubscribed).toBe(false);
  });

  it('reports a blocked permission and does not subscribe', async () => {
    const pushManager = installBrowser({ subscribed: false, permission: 'denied' });
    const { result } = renderHook(() => usePushNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isAvailable).toBe(true));
    expect(result.current.isBlocked).toBe(true);
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('removes the server row and the browser subscription when turned off', async () => {
    installBrowser({ subscribed: true, permission: 'granted' });
    const { result } = renderHook(() => usePushNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));
    act(() => result.current.toggle(false));
    await waitFor(() => expect(result.current.isSubscribed).toBe(false));
    expect(unsubscribePush).toHaveBeenCalledWith('https://push.example/abc');
    expect(browserSubscription.unsubscribe).toHaveBeenCalled();
  });
});
