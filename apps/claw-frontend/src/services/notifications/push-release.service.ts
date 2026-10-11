import { notificationsRepository } from '@/repositories/notifications/notifications.repository';
import { isPushSupported } from '@/utilities/push-subscription.utility';
import { shouldRegisterServiceWorker } from '@/utilities/service-worker.utility';

/**
 * Forgets this browser's push subscription, on the server first and then in the browser.
 *
 * It runs on sign-out, while the session still works: a subscription left behind would keep
 * showing the previous person's notifications to whoever uses this browser next. It never throws,
 * so a push problem cannot stop someone from signing out.
 */
export async function releasePushSubscription(): Promise<void> {
  if (!isPushSupported() || !shouldRegisterServiceWorker(process.env.NODE_ENV)) {
    return;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription === null || subscription === undefined) {
      return;
    }
    await notificationsRepository.unsubscribePush(subscription.endpoint);
    await subscription.unsubscribe();
  } catch {
    // Best effort by design.
  }
}
