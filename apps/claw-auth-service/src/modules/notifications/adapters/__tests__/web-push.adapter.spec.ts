import webpush from 'web-push';

import { AppConfig } from '../../../../app/config/app.config';
import { WebPushAdapter } from '../web-push.adapter';

vi.mock('web-push', () => {
  class WebPushError extends Error {
    constructor(
      message: string,
      readonly statusCode: number,
    ) {
      super(message);
    }
  }
  return { default: { sendNotification: vi.fn(), WebPushError } };
});

const subscription = { endpoint: 'https://push.example.test/abc', p256dh: 'p', auth: 'a' };
const message = { title: 't', body: 'b', link: '/x', lang: 'en', tag: 'k' };
const keys = {
  VAPID_PUBLIC_KEY: 'pub',
  VAPID_PRIVATE_KEY: 'priv',
  VAPID_SUBJECT: 'mailto:ops@example.test',
};

function withConfig(values: Record<string, string | undefined>): void {
  vi.spyOn(AppConfig, 'get').mockReturnValue(values as never);
}

describe('WebPushAdapter', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is disabled unless the whole VAPID set is configured', () => {
    withConfig({ VAPID_PUBLIC_KEY: 'pub' });
    expect(new WebPushAdapter().getConfig()).toEqual({ enabled: false, publicKey: null });
    withConfig(keys);
    expect(new WebPushAdapter().getConfig()).toEqual({ enabled: true, publicKey: 'pub' });
  });

  it('does not send when disabled', async () => {
    withConfig({});
    await expect(new WebPushAdapter().send(subscription, message)).resolves.toBe('FAILED');
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('sends the payload with a TTL and the VAPID details', async () => {
    withConfig(keys);
    vi.mocked(webpush.sendNotification).mockResolvedValue({
      statusCode: 201,
      body: '',
      headers: {},
    });
    await expect(new WebPushAdapter().send(subscription, message)).resolves.toBe('SENT');
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      { endpoint: subscription.endpoint, keys: { p256dh: 'p', auth: 'a' } },
      JSON.stringify(message),
      expect.objectContaining({
        TTL: 86_400,
        vapidDetails: expect.objectContaining({ publicKey: 'pub' }),
      }),
    );
  });

  it('reports a 410 as GONE and any other failure as FAILED', async () => {
    withConfig(keys);
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(
      new webpush.WebPushError('gone', 410, {}, '', subscription.endpoint),
    );
    await expect(new WebPushAdapter().send(subscription, message)).resolves.toBe('GONE');
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(
      new webpush.WebPushError('bad', 500, {}, '', subscription.endpoint),
    );
    await expect(new WebPushAdapter().send(subscription, message)).resolves.toBe('FAILED');
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(new Error('network'));
    await expect(new WebPushAdapter().send(subscription, message)).resolves.toBe('FAILED');
  });
});
