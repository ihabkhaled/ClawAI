import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/ui/use-toast';
import { NOTIFICATIONS_STALE_MS } from '@/constants/notifications.constants';
import { ToastVariant } from '@/enums/toast-variant.enum';
import { useTranslation } from '@/lib/i18n';
import { notificationsRepository } from '@/repositories/notifications/notifications.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import type { UsePushNotificationsReturn } from '@/types/notifications-ui.types';
import {
  isPushSupported,
  toPushSubscriptionBody,
  urlBase64ToBytes,
} from '@/utilities/push-subscription.utility';
import { shouldRegisterServiceWorker } from '@/utilities/service-worker.utility';

/**
 * Web Push for this browser. Turning it on asks the browser for permission, subscribes through the
 * app's service worker and tells the server; turning it off does the reverse. It is available only
 * when the browser supports push, the service worker is registered (production builds) and the
 * server has VAPID keys, so the switch never appears where it could only fail.
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [supported, setSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const config = useQuery({
    queryKey: queryKeys.notifications.pushConfig(),
    queryFn: () => notificationsRepository.getPushConfig(),
    enabled: isAuthenticated && supported,
    staleTime: NOTIFICATIONS_STALE_MS,
  });

  useEffect(() => {
    if (!isPushSupported() || !shouldRegisterServiceWorker(process.env.NODE_ENV)) {
      return;
    }
    let cancelled = false;
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (cancelled) {
          return;
        }
        setSupported(true);
        setIsSubscribed(subscription !== null);
        setIsBlocked(Notification.permission === 'denied');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const fail = useCallback((): void => {
    toast({ title: t('notifications.preferences.pushFailed'), variant: ToastVariant.Destructive });
  }, [toast, t]);

  const enable = useCallback(async (publicKey: string): Promise<void> => {
    const permission = await Notification.requestPermission();
    setIsBlocked(permission === 'denied');
    if (permission !== 'granted') {
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBytes(publicKey),
    });
    const body = toPushSubscriptionBody(subscription);
    if (body === null) {
      await subscription.unsubscribe();
      throw new Error('The browser returned an incomplete push subscription');
    }
    try {
      await notificationsRepository.subscribePush(body);
    } catch (error) {
      await subscription.unsubscribe();
      throw error;
    }
    setIsSubscribed(true);
  }, []);

  const disable = useCallback(async (): Promise<void> => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription !== null) {
      await notificationsRepository.unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setIsSubscribed(false);
  }, []);

  const toggle = useCallback(
    (enabled: boolean): void => {
      const publicKey = config.data?.publicKey ?? null;
      if (isBusy || (enabled && publicKey === null)) {
        return;
      }
      setIsBusy(true);
      const work = enabled && publicKey !== null ? enable(publicKey) : disable();
      work.catch(fail).finally(() => {
        setIsBusy(false);
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences() });
      });
    },
    [config.data?.publicKey, isBusy, enable, disable, fail, queryClient],
  );

  return {
    isAvailable: supported && config.data?.enabled === true,
    isSubscribed,
    isBlocked,
    isBusy,
    toggle,
  };
}
