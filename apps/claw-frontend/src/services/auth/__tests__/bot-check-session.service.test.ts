import { describe, expect, it, vi } from 'vitest';

import { BotCheckAction } from '@/enums/bot-check-action.enum';
import { BotCheckStatus } from '@/enums/bot-check-status.enum';
import { createBotCheckSession } from '@/services/auth/bot-check-session.service';
import type { BotCheckConfig, BotCheckSessionDependencies } from '@/types/bot-check.types';

const FULL_CONFIG: BotCheckConfig = {
  pow: { enabled: true, difficulty: 8 },
  turnstile: { siteKey: 'ts-site' },
  recaptcha: { siteKey: 'rc-site', action: BotCheckAction.REGISTER },
};

function makeDependencies(
  config: BotCheckConfig = FULL_CONFIG,
  overrides: Partial<BotCheckSessionDependencies> = {},
) {
  let challengeCount = 0;
  const handle = {
    nextToken: vi.fn(async () => 'turnstile-token'),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  const dependencies: BotCheckSessionDependencies = {
    action: BotCheckAction.REGISTER,
    loadConfig: vi.fn(async () => config),
    createChallenge: vi.fn(async () => {
      challengeCount += 1;
      return { token: `pow-token-${challengeCount}`, salt: 's', difficulty: 8, expiresAt: '' };
    }),
    solveChallenge: vi.fn(async () => '1234'),
    mountTurnstile: vi.fn(async () => handle),
    loadRecaptcha: vi.fn(async () => undefined),
    executeRecaptcha: vi.fn(async () => 'recaptcha-token'),
    onStatusChange: vi.fn(),
    ...overrides,
  };
  return { dependencies, handle };
}

describe('createBotCheckSession', () => {
  it('collects proof of work, the Turnstile token and a reCAPTCHA token for the form action', async () => {
    const { dependencies, handle } = makeDependencies();
    const session = createBotCheckSession(dependencies, true);
    session.setContainer(document.createElement('div'));

    const payload = await session.collect();

    expect(payload).toEqual({
      pow: { token: 'pow-token-1', nonce: '1234' },
      turnstileToken: 'turnstile-token',
      recaptchaToken: 'recaptcha-token',
    });
    expect(dependencies.mountTurnstile).toHaveBeenCalledWith(expect.any(HTMLElement), 'ts-site');
    expect(dependencies.executeRecaptcha).toHaveBeenCalledWith('rc-site', BotCheckAction.REGISTER);
    // Single-use token: the widget is asked for a fresh one straight away.
    expect(handle.reset).toHaveBeenCalledTimes(1);
  });

  it('sends only proof of work while no admin has configured the third-party checks', async () => {
    const { dependencies } = makeDependencies({ ...FULL_CONFIG, turnstile: null, recaptcha: null });
    const session = createBotCheckSession(dependencies, true);
    session.setContainer(document.createElement('div'));

    await expect(session.collect()).resolves.toEqual({
      pow: { token: 'pow-token-1', nonce: '1234' },
    });
    expect(dependencies.mountTurnstile).not.toHaveBeenCalled();
    expect(dependencies.loadRecaptcha).not.toHaveBeenCalled();
    expect(dependencies.executeRecaptcha).not.toHaveBeenCalled();
  });

  it('skips the proof of work when the server reports it disabled', async () => {
    const { dependencies } = makeDependencies({
      ...FULL_CONFIG,
      pow: { enabled: false, difficulty: 0 },
    });
    const session = createBotCheckSession(dependencies, false);
    const payload = await session.collect();
    expect(payload.pow).toBeUndefined();
    expect(dependencies.createChallenge).not.toHaveBeenCalled();
  });

  it('leaves a failed check out instead of failing the submit, and reports DEGRADED', async () => {
    const { dependencies } = makeDependencies(FULL_CONFIG, {
      createChallenge: vi.fn(async () => {
        throw new Error('429');
      }),
      mountTurnstile: vi.fn(async () => {
        throw new Error('script blocked');
      }),
      executeRecaptcha: vi.fn(async () => {
        throw new Error('blocked');
      }),
    });
    const session = createBotCheckSession(dependencies, false);
    session.setContainer(document.createElement('div'));
    session.prepare();
    await vi.waitFor(() =>
      expect(dependencies.onStatusChange).toHaveBeenCalledWith(BotCheckStatus.DEGRADED),
    );
    await expect(session.collect()).resolves.toEqual({});
  });

  it('warms up on prepare: one challenge solved, Turnstile mounted, reCAPTCHA loaded', async () => {
    const { dependencies } = makeDependencies();
    const session = createBotCheckSession(dependencies, true);
    session.setContainer(document.createElement('div'));
    session.prepare();
    await vi.waitFor(() =>
      expect(dependencies.onStatusChange).toHaveBeenLastCalledWith(BotCheckStatus.READY),
    );
    expect(dependencies.onStatusChange).toHaveBeenCalledWith(BotCheckStatus.CHECKING);
    expect(dependencies.loadRecaptcha).toHaveBeenCalledWith('rc-site');
    expect(dependencies.mountTurnstile).toHaveBeenCalledTimes(1);

    // The prepared solution is the one handed over: no second challenge for this submit.
    const payload = await session.collect();
    expect(payload.pow?.token).toBe('pow-token-1');
  });

  it('a sign-up session prepares a NEW challenge after each submit (tokens are single use)', async () => {
    const { dependencies } = makeDependencies();
    const session = createBotCheckSession(dependencies, true);
    const first = await session.collect();
    const second = await session.collect();
    expect(first.pow?.token).toBe('pow-token-1');
    expect(second.pow?.token).toBe('pow-token-2');
  });

  it('a sign-in session stays idle until the server asks, then keeps checking', async () => {
    const { dependencies } = makeDependencies();
    const session = createBotCheckSession(dependencies, false);
    expect(session.isRequired()).toBe(false);
    await session.collect();
    expect(dependencies.createChallenge).toHaveBeenCalledTimes(1);

    session.markRequired();
    expect(session.isRequired()).toBe(true);
    await session.collect();
    await vi.waitFor(() => expect(dependencies.createChallenge).toHaveBeenCalledTimes(3));
  });

  it('stops reporting and removes the widget once disposed', async () => {
    const { dependencies, handle } = makeDependencies();
    const session = createBotCheckSession(dependencies, true);
    session.setContainer(document.createElement('div'));
    session.prepare();
    await vi.waitFor(() => expect(dependencies.mountTurnstile).toHaveBeenCalled());
    session.dispose();
    const calls = vi.mocked(dependencies.onStatusChange).mock.calls.length;
    session.prepare();
    expect(vi.mocked(dependencies.onStatusChange).mock.calls.length).toBe(calls);
    await vi.waitFor(() => expect(handle.remove).toHaveBeenCalled());
  });
});
