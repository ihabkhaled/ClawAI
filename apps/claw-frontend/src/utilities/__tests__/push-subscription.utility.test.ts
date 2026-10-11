import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isPushSupported,
  toPushSubscriptionBody,
  urlBase64ToBytes,
} from '@/utilities/push-subscription.utility';

describe('urlBase64ToBytes', () => {
  it('decodes URL-safe base64 without padding', () => {
    // "hello?>" encodes to aGVsbG8_Pg in URL-safe base64.
    expect(Array.from(urlBase64ToBytes('aGVsbG8_Pg'))).toEqual([104, 101, 108, 108, 111, 63, 62]);
  });

  it('decodes an 86-character VAPID-length key to 64 bytes', () => {
    const key = 'B'.repeat(86);
    expect(urlBase64ToBytes(key)).toHaveLength(64);
  });
});

describe('toPushSubscriptionBody', () => {
  function subscription(json: unknown): PushSubscription {
    return { toJSON: () => json } as unknown as PushSubscription;
  }

  it('keeps the endpoint and both keys', () => {
    expect(
      toPushSubscriptionBody(
        subscription({ endpoint: 'https://push.example/x', keys: { p256dh: 'p', auth: 'a' } }),
      ),
    ).toEqual({ endpoint: 'https://push.example/x', keys: { p256dh: 'p', auth: 'a' } });
  });

  it('returns null when the browser omitted a key', () => {
    expect(
      toPushSubscriptionBody(
        subscription({ endpoint: 'https://push.example/x', keys: { p256dh: 'p' } }),
      ),
    ).toBeNull();
    expect(toPushSubscriptionBody(subscription({}))).toBeNull();
  });
});

describe('isPushSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false without the push API and true when every piece exists', () => {
    expect(isPushSupported()).toBe(false);
    vi.stubGlobal('PushManager', class {});
    vi.stubGlobal('Notification', class {});
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
    expect(isPushSupported()).toBe(true);
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });
});
