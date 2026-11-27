import { type Mock, vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { type SystemSettingService } from '../../../system-settings/services/system-setting.service';
import { SecuritySettingsService } from '../security-settings.service';

describe('SecuritySettingsService', () => {
  let stored: Map<string, string>;
  let get: Mock;
  let service: SecuritySettingsService;

  function env(values: Partial<ReturnType<typeof AppConfig.get>>): void {
    vi.spyOn(AppConfig, 'get').mockReturnValue(values as ReturnType<typeof AppConfig.get>);
  }

  beforeEach(() => {
    stored = new Map();
    get = vi.fn(async (key: string) => Promise.resolve(stored.get(key) ?? null));
    env({});
    service = new SecuritySettingsService({ get } as unknown as SystemSettingService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the contract defaults with nothing configured', async () => {
    await expect(service.resolve()).resolves.toEqual({
      turnstile: null,
      recaptcha: null,
      recaptchaMinScore: 0.5,
      powDifficulty: 18,
      blockedDomains: [],
      allowedDomains: [],
      signupMaxPer10Min: 30,
      signupMaxPerDevicePerDay: 3,
    });
  });

  it('reads the admin values and clamps out-of-range numbers to their defaults', async () => {
    stored.set('security.pow.difficulty', '20');
    stored.set('security.recaptcha.minScore', '0.7');
    stored.set('security.signup.maxPer10Min', '0');
    stored.set('security.signup.maxPerDevicePerDay', '5');
    stored.set('security.email.blockedDomains', 'a.com, b.org');
    stored.set('security.email.allowedDomains', '@c.net');
    const settings = await service.resolve();
    expect(settings).toMatchObject({
      powDifficulty: 20,
      recaptchaMinScore: 0.7,
      signupMaxPer10Min: 30,
      signupMaxPerDevicePerDay: 5,
      blockedDomains: ['a.com', 'b.org'],
      allowedDomains: ['c.net'],
    });
    stored.set('security.pow.difficulty', '30');
    expect((await service.resolve()).powDifficulty).toBe(18);
  });

  it('takes captcha keys from the environment when no setting is stored', async () => {
    env({
      TURNSTILE_SITE_KEY: 'env-ts-site',
      TURNSTILE_SECRET_KEY: 'env-ts-secret',
      RECAPTCHA_SITE_KEY: 'env-rc-site',
    });
    const settings = await service.resolve();
    expect(settings.turnstile).toEqual({ siteKey: 'env-ts-site', secretKey: 'env-ts-secret' });
    // A site key alone cannot be verified: the provider stays off.
    expect(settings.recaptcha).toBeNull();
  });

  it('lets a non-empty stored key win over the environment, per key', async () => {
    env({ TURNSTILE_SITE_KEY: 'env-site', TURNSTILE_SECRET_KEY: 'env-secret' });
    stored.set('security.turnstile.siteKey', 'db-site');
    stored.set('security.turnstile.secretKey', '   ');
    const settings = await service.resolve();
    expect(settings.turnstile).toEqual({ siteKey: 'db-site', secretKey: 'env-secret' });
  });

  it('turns reCAPTCHA on from stored keys alone', async () => {
    stored.set('security.recaptcha.siteKey', 'rc-site');
    stored.set('security.recaptcha.secretKey', 'rc-secret');
    expect((await service.resolve()).recaptcha).toEqual({
      siteKey: 'rc-site',
      secretKey: 'rc-secret',
    });
  });
});
