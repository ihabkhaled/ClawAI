import { type Mock, vi } from 'vitest';

import { RECAPTCHA_VERIFY_URL, TURNSTILE_VERIFY_URL } from '../../constants/anti-abuse.constants';
import { CaptchaHttpAdapter } from '../captcha-http.adapter';

const FORM = new URLSearchParams({ secret: 'super-secret-value', response: 'token' });

describe('CaptchaHttpAdapter URL guard (TD-038)', () => {
  let fetchMock: Mock;
  let adapter: CaptchaHttpAdapter;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response('{"success":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    adapter = new CaptchaHttpAdapter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([TURNSTILE_VERIFY_URL, RECAPTCHA_VERIFY_URL])(
    'reaches the allowed host %s',
    async (url) => {
      await expect(adapter.postForm(url, FORM)).resolves.toEqual({ success: true });
      expect(fetchMock.mock.calls[0]?.[0]).toBe(url);
    },
  );

  it.each([
    'https://evil.example.com/siteverify',
    'http://127.0.0.1:6379/',
    'https://169.254.169.254/latest',
  ])('refuses %s without sending the secret', async (url) => {
    await expect(adapter.postForm(url, FORM)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
