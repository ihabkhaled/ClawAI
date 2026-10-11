import type { PushSubscriptionBody } from '@/types/notifications.types';

/** True when this browser can show a push notification at all (a service worker, the push API and permission prompts). */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** The VAPID public key arrives URL-safe base64; `pushManager.subscribe` wants the raw bytes. */
export function urlBase64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll('-', '+').replaceAll('_', '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.codePointAt(index) ?? 0;
  }
  return bytes;
}

/** Reduces a browser subscription to what the server stores; null when the browser omitted a key. */
export function toPushSubscriptionBody(
  subscription: PushSubscription,
): PushSubscriptionBody | null {
  const json = subscription.toJSON();
  const p256dh = json.keys?.['p256dh'];
  const auth = json.keys?.['auth'];
  if (json.endpoint === undefined || p256dh === undefined || auth === undefined) {
    return null;
  }
  return { endpoint: json.endpoint, keys: { p256dh, auth } };
}
