import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authService } from '@/services/auth/auth.service';
import { ApiClientError } from '@/services/shared/api-client';
import type { LoginBotCheckHooks } from '@/types/bot-check.types';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  device: vi.fn(),
}));

vi.mock('@/repositories/auth/auth.repository', () => ({
  authRepository: { login: mocks.login, register: mocks.register },
}));
vi.mock('@/lib/bot-check/device-fingerprint', () => ({ collectDevicePayload: mocks.device }));

const DEVICE = { fingerprint: 'f'.repeat(64), deviceId: '11111111-1111-4111-8111-111111111111' };
const CHECKS = { pow: { token: 'pow', nonce: '7' }, turnstileToken: 'ts' };
const LOGIN_RESPONSE = {
  tokens: { accessToken: 'a', refreshToken: 'r' },
  user: { id: 'u1', email: 'ada@example.com' },
};

function hooks(required = false): LoginBotCheckHooks & { state: { required: boolean } } {
  const state = { required };
  return {
    state,
    collectBotCheck: vi.fn(async () => CHECKS),
    isBotCheckRequired: () => state.required,
    markBotCheckRequired: vi.fn(() => {
      state.required = true;
    }),
  };
}

const botCheckRequired = (): ApiClientError =>
  new ApiClientError({ message: 'x', status: 428, code: 'BOT_CHECK_REQUIRED' });

describe('authService.loginWithBotCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.device.mockResolvedValue(DEVICE);
  });

  it('always sends the device and no bot checks up front', async () => {
    mocks.login.mockResolvedValue(LOGIN_RESPONSE);
    const h = hooks();
    await authService.loginWithBotCheck({ email: 'ada@example.com', password: 'p' }, h);
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(mocks.login).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'p',
      device: DEVICE,
    });
    expect(h.collectBotCheck).not.toHaveBeenCalled();
  });

  it('retries ONCE with bot checks after 428 BOT_CHECK_REQUIRED', async () => {
    mocks.login.mockRejectedValueOnce(botCheckRequired()).mockResolvedValueOnce(LOGIN_RESPONSE);
    const h = hooks();
    await expect(
      authService.loginWithBotCheck({ email: 'ada@example.com', password: 'p' }, h),
    ).resolves.toEqual(LOGIN_RESPONSE);
    expect(mocks.login).toHaveBeenCalledTimes(2);
    expect(mocks.login).toHaveBeenLastCalledWith({
      email: 'ada@example.com',
      password: 'p',
      device: DEVICE,
      botCheck: CHECKS,
    });
    expect(h.markBotCheckRequired).toHaveBeenCalledTimes(1);
  });

  it('does not loop: a second 428 after the retry reaches the form', async () => {
    mocks.login.mockRejectedValue(botCheckRequired());
    await expect(
      authService.loginWithBotCheck({ email: 'ada@example.com', password: 'p' }, hooks()),
    ).rejects.toMatchObject({ code: 'BOT_CHECK_REQUIRED' });
    expect(mocks.login).toHaveBeenCalledTimes(2);
  });

  it('sends checks up front once the server has asked for them', async () => {
    mocks.login.mockResolvedValue(LOGIN_RESPONSE);
    await authService.loginWithBotCheck({ email: 'ada@example.com', password: 'p' }, hooks(true));
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(mocks.login.mock.calls[0]?.[0]).toMatchObject({ botCheck: CHECKS, device: DEVICE });
  });

  it('never retries any other refusal', async () => {
    mocks.login.mockRejectedValue(
      new ApiClientError({ message: 'x', status: 401, code: 'INVALID_CREDENTIALS' }),
    );
    const h = hooks();
    await expect(
      authService.loginWithBotCheck({ email: 'ada@example.com', password: 'p' }, h),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(h.collectBotCheck).not.toHaveBeenCalled();
  });

  it('still signs in without a device when the browser cannot compute one', async () => {
    mocks.device.mockResolvedValue(null);
    mocks.login.mockResolvedValue(LOGIN_RESPONSE);
    await authService.loginWithBotCheck({ email: 'ada@example.com', password: 'p' }, hooks());
    expect(mocks.login.mock.calls[0]?.[0]).not.toHaveProperty('device');
  });
});

describe('authService.register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.device.mockResolvedValue(DEVICE);
    mocks.register.mockResolvedValue({ user: { id: 'u1' }, verificationRequired: true });
  });

  it('sends the bot checks it was given plus the device', async () => {
    await authService.register({
      email: 'ada@example.com',
      password: 'Password1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      botCheck: CHECKS,
    });
    expect(mocks.register).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'Password1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      botCheck: CHECKS,
      device: DEVICE,
    });
  });
});
