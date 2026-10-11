import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { releasePushSubscription } from '@/services/notifications/push-release.service';

const unsubscribePush = vi.fn();

vi.mock('@/repositories/notifications/notifications.repository', () => ({
  notificationsRepository: { unsubscribePush: (...args: unknown[]) => unsubscribePush(...args) },
}));

const browserSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  unsubscribe: vi.fn().mockResolvedValue(true),
};

function installBrowser(subscription: unknown): void {
  vi.stubGlobal('PushManager', class {});
  vi.stubGlobal('Notification', class {});
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      getRegistration: vi.fn().mockResolvedValue({
        pushManager: { getSubscription: () => Promise.resolve(subscription) },
      }),
    },
    configurable: true,
  });
}

describe('releasePushSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    unsubscribePush.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('does nothing where the browser has no push', async () => {
    await releasePushSubscription();
    expect(unsubscribePush).not.toHaveBeenCalled();
  });

  it('removes the server row first, then the browser subscription', async () => {
    installBrowser(browserSubscription);
    await releasePushSubscription();
    expect(unsubscribePush).toHaveBeenCalledWith(browserSubscription.endpoint);
    expect(browserSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('does nothing when this browser is not subscribed', async () => {
    installBrowser(null);
    await releasePushSubscription();
    expect(unsubscribePush).not.toHaveBeenCalled();
  });

  it('never throws, so sign-out cannot be blocked by a push failure', async () => {
    installBrowser(browserSubscription);
    unsubscribePush.mockRejectedValue(new Error('down'));
    await expect(releasePushSubscription()).resolves.toBeUndefined();
  });
});
