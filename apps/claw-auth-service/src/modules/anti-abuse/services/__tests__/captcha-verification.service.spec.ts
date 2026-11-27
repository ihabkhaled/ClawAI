import { type Mock, vi } from 'vitest';
import { Logger } from '@nestjs/common';

import { CaptchaHttpAdapter } from '../../adapters/captcha-http.adapter';
import { BotCheckAction } from '../../enums/bot-check-action.enum';
import { CaptchaOutcome } from '../../enums/captcha-outcome.enum';
import { CaptchaVerificationService } from '../captcha-verification.service';

const KEYS = { siteKey: 'site-key', secretKey: 'super-secret-value' };
const LOGIN = { action: BotCheckAction.LOGIN, minScore: 0.5 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('CaptchaVerificationService (real adapter, fetch mocked)', () => {
  let fetchMock: Mock;
  let service: CaptchaVerificationService;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    service = new CaptchaVerificationService(new CaptchaHttpAdapter());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('Turnstile success: posts secret, token and client IP to siteverify', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }));

    await expect(service.verifyTurnstile(KEYS, 'tok', '203.0.113.4')).resolves.toBe(
      CaptchaOutcome.PASSED,
    );
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('error');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const form = new URLSearchParams(String(init.body));
    expect(form.get('secret')).toBe('super-secret-value');
    expect(form.get('response')).toBe('tok');
    expect(form.get('remoteip')).toBe('203.0.113.4');
  });

  it('Turnstile failure is REJECTED', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, 'error-codes': ['bad'] }));
    await expect(service.verifyTurnstile(KEYS, 'tok', null)).resolves.toBe(CaptchaOutcome.REJECTED);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URLSearchParams(String(init.body)).has('remoteip')).toBe(false);
  });

  it('reCAPTCHA success with the right action and score passes', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, action: 'login', score: 0.8 }));
    await expect(service.verifyRecaptcha(KEYS, 'tok', null, LOGIN)).resolves.toBe(
      CaptchaOutcome.PASSED,
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://www.google.com/recaptcha/api/siteverify');
  });

  it('reCAPTCHA low score is REJECTED', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, action: 'login', score: 0.2 }));
    await expect(service.verifyRecaptcha(KEYS, 'tok', null, LOGIN)).resolves.toBe(
      CaptchaOutcome.REJECTED,
    );
  });

  it('reCAPTCHA wrong action is REJECTED', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, action: 'register', score: 0.9 }));
    await expect(service.verifyRecaptcha(KEYS, 'tok', null, LOGIN)).resolves.toBe(
      CaptchaOutcome.REJECTED,
    );
  });

  it('reCAPTCHA failure is REJECTED', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false }));
    await expect(service.verifyRecaptcha(KEYS, 'tok', null, LOGIN)).resolves.toBe(
      CaptchaOutcome.REJECTED,
    );
  });

  it.each([
    ['a network error', (): Promise<Response> => Promise.reject(new TypeError('fetch failed'))],
    ['a timeout', (): Promise<Response> => Promise.reject(new DOMException('t', 'TimeoutError'))],
    ['an HTTP 500', (): Promise<Response> => Promise.resolve(jsonResponse({}, 500))],
    ['an unreadable body', (): Promise<Response> => Promise.resolve(new Response('<html>'))],
  ])('%s is UNREACHABLE for both providers, and the secret is never logged', async (_n, reply) => {
    fetchMock.mockImplementation(reply);
    const logged: unknown[] = [];
    const capture = (...parts: unknown[]): void => {
      logged.push(...parts);
    };
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(capture);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(capture);
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(capture);

    await expect(service.verifyTurnstile(KEYS, 'tok', null)).resolves.toBe(
      CaptchaOutcome.UNREACHABLE,
    );
    await expect(service.verifyRecaptcha(KEYS, 'tok', null, LOGIN)).resolves.toBe(
      CaptchaOutcome.UNREACHABLE,
    );
    expect(JSON.stringify(logged)).not.toContain('super-secret-value');
  });
});
