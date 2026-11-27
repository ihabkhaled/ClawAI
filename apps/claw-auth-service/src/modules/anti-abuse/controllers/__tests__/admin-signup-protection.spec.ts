import { type Mock, vi } from 'vitest';
import { Permission } from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { IS_PUBLIC_KEY } from '../../../../app/decorators/public.decorator';
import { type SystemSettingService } from '../../../system-settings/services/system-setting.service';
import { DISPOSABLE_EMAIL_DOMAINS } from '../../constants/anti-abuse.constants';
import { emailCheckQuerySchema } from '../../dto/anti-abuse.dto';
import { EmailDomainReason } from '../../enums/email-domain-reason.enum';
import { EmailDomainVerdict } from '../../enums/email-domain-verdict.enum';
import { MailDomainStatus } from '../../enums/mail-domain-status.enum';
import { SecurityKeySource } from '../../enums/security-key-source.enum';
import { EmailDomainPolicyService } from '../../services/email-domain-policy.service';
import { type MailDomainService } from '../../services/mail-domain.service';
import { SecuritySettingsService } from '../../services/security-settings.service';
import { explainMailStatus, toCheckedDomain } from '../../utilities/email-domain.utility';
import { keySource } from '../../utilities/security-setting-parse.utility';
import { AdminSignupProtectionController } from '../admin-signup-protection.controller';

describe('sign-up protection helpers', () => {
  it('keySource: a saved setting wins, then the environment, blanks count as absent', () => {
    expect(keySource('saved', 'env')).toBe(SecurityKeySource.SETTING);
    expect(keySource('  ', 'env')).toBe(SecurityKeySource.ENVIRONMENT);
    expect(keySource(null, 'env')).toBe(SecurityKeySource.ENVIRONMENT);
    expect(keySource(null, '  ')).toBe(SecurityKeySource.NONE);
    expect(keySource(null, undefined)).toBe(SecurityKeySource.NONE);
  });

  it.each([
    ['bot@Mailinator.com', 'mailinator.com'],
    ['mailinator.com', 'mailinator.com'],
    ['  Gmail.COM. ', 'gmail.com'],
    ['@uberip.com', 'uberip.com'],
    ['a@inbox.mail-host.co.uk', 'inbox.mail-host.co.uk'],
  ])('toCheckedDomain(%s) reads %s', (value, domain) => {
    expect(toCheckedDomain(value)).toBe(domain);
  });

  it.each([
    'localhost',
    'a..com',
    '-bad.com',
    'bad-.com',
    'x.c0m',
    'a@',
    'has space.com',
    `${'a'.repeat(250)}.com`,
  ])('toCheckedDomain refuses %s', (value) => {
    expect(toCheckedDomain(value)).toBeNull();
  });

  it('explainMailStatus maps every DNS answer to a verdict and a reason', () => {
    expect(explainMailStatus('d.com', MailDomainStatus.UNDELIVERABLE)).toEqual({
      domain: 'd.com',
      verdict: EmailDomainVerdict.UNDELIVERABLE,
      reason: EmailDomainReason.NO_MAIL_SERVER,
    });
    expect(explainMailStatus('d.com', MailDomainStatus.DELIVERABLE).reason).toBe(
      EmailDomainReason.MAIL_SERVER_FOUND,
    );
    expect(explainMailStatus('d.com', MailDomainStatus.UNKNOWN)).toMatchObject({
      verdict: EmailDomainVerdict.ALLOWED,
      reason: EmailDomainReason.MAIL_CHECK_INCONCLUSIVE,
    });
  });

  it('the email-check query accepts an address or a domain and refuses junk', () => {
    expect(emailCheckQuerySchema.parse({ value: 'x@Uberip.com' })).toEqual({ value: 'uberip.com' });
    expect(emailCheckQuerySchema.safeParse({ value: 'not a domain' }).success).toBe(false);
    expect(emailCheckQuerySchema.safeParse({ value: '' }).success).toBe(false);
    expect(emailCheckQuerySchema.safeParse({}).success).toBe(false);
  });
});

describe('SecuritySettingsService.status', () => {
  let stored: Map<string, string>;
  let service: SecuritySettingsService;

  function env(values: Partial<ReturnType<typeof AppConfig.get>>): void {
    vi.spyOn(AppConfig, 'get').mockReturnValue(values as ReturnType<typeof AppConfig.get>);
  }

  beforeEach(() => {
    stored = new Map();
    const get = vi.fn(async (key: string) => Promise.resolve(stored.get(key) ?? null));
    env({});
    service = new SecuritySettingsService({ get } as unknown as SystemSettingService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports both providers off and the built-in list size with nothing configured', async () => {
    const status = await service.status();
    expect(status.turnstile).toEqual({
      active: false,
      siteKey: null,
      siteKeySource: SecurityKeySource.NONE,
      secretKeySource: SecurityKeySource.NONE,
    });
    expect(status.recaptcha.active).toBe(false);
    expect(status.builtInDisposableDomainCount).toBe(DISPOSABLE_EMAIL_DOMAINS.size);
    expect(status.builtInDisposableDomainCount).toBeGreaterThan(10_000);
  });

  it('shows server-environment keys as active, with the public site key and no secret', async () => {
    env({ TURNSTILE_SITE_KEY: 'env-site', TURNSTILE_SECRET_KEY: 'env-secret-value' });
    const status = await service.status();
    expect(status.turnstile).toEqual({
      active: true,
      siteKey: 'env-site',
      siteKeySource: SecurityKeySource.ENVIRONMENT,
      secretKeySource: SecurityKeySource.ENVIRONMENT,
    });
    expect(JSON.stringify(status)).not.toContain('env-secret-value');
  });

  it('a saved setting wins over the environment, and one key alone keeps the provider off', async () => {
    env({ RECAPTCHA_SITE_KEY: 'env-site', RECAPTCHA_SECRET_KEY: 'env-secret' });
    stored.set('security.recaptcha.siteKey', 'saved-site');
    stored.set('security.turnstile.siteKey', 'only-site');
    const status = await service.status();
    expect(status.recaptcha).toEqual({
      active: true,
      siteKey: 'saved-site',
      siteKeySource: SecurityKeySource.SETTING,
      secretKeySource: SecurityKeySource.ENVIRONMENT,
    });
    expect(status.turnstile).toMatchObject({
      active: false,
      siteKey: 'only-site',
      secretKeySource: SecurityKeySource.NONE,
    });
  });
});

describe('EmailDomainPolicyService.explain', () => {
  let resolve: Mock;
  let check: Mock;
  let service: EmailDomainPolicyService;

  beforeEach(() => {
    resolve = vi
      .fn()
      .mockResolvedValue({ blockedDomains: ['spam.example'], allowedDomains: ['mailinator.com'] });
    check = vi.fn().mockResolvedValue(MailDomainStatus.DELIVERABLE);
    service = new EmailDomainPolicyService(
      { resolve } as unknown as SecuritySettingsService,
      { check } as unknown as MailDomainService,
    );
  });

  it.each([
    ['a.spam.example', EmailDomainVerdict.DISPOSABLE, EmailDomainReason.ADMIN_BLOCKED],
    ['mailinator.com', EmailDomainVerdict.ALLOWED, EmailDomainReason.ADMIN_ALLOWED],
    ['euploading.com', EmailDomainVerdict.DISPOSABLE, EmailDomainReason.BUILT_IN_LIST],
    ['gmail.com', EmailDomainVerdict.ALLOWED, EmailDomainReason.MAIL_SERVER_FOUND],
  ])('%s -> %s (%s)', async (domain, verdict, reason) => {
    await expect(service.explain(domain)).resolves.toEqual({ domain, verdict, reason });
  });

  it('only a domain no list decided costs a DNS query', async () => {
    await service.explain('euploading.com');
    expect(check).not.toHaveBeenCalled();
    check.mockResolvedValueOnce(MailDomainStatus.UNDELIVERABLE);
    await expect(service.explain('no-mx.example')).resolves.toMatchObject({
      reason: EmailDomainReason.NO_MAIL_SERVER,
    });
    expect(check).toHaveBeenCalledWith('no-mx.example');
  });

  it('evaluate keeps returning the verdict of the same rules', async () => {
    await expect(service.evaluate('x@a.spam.example')).resolves.toBe(EmailDomainVerdict.DISPOSABLE);
    await expect(service.evaluate('no-at-sign')).resolves.toBe(EmailDomainVerdict.ALLOWED);
  });
});

describe('AdminSignupProtectionController', () => {
  it('delegates both reads and is ADMIN + ADMIN_SYSTEM_VIEW only', async () => {
    const status = vi.fn().mockResolvedValue({ builtInDisposableDomainCount: 1 });
    const explain = vi.fn().mockResolvedValue({ domain: 'a.com' });
    const controller = new AdminSignupProtectionController(
      { status } as unknown as SecuritySettingsService,
      { explain } as unknown as EmailDomainPolicyService,
    );

    await expect(controller.status()).resolves.toEqual({ builtInDisposableDomainCount: 1 });
    await expect(controller.emailCheck({ value: 'a.com' })).resolves.toEqual({ domain: 'a.com' });
    expect(explain).toHaveBeenCalledWith('a.com');
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AdminSignupProtectionController)).toBeUndefined();
    const values = (Reflect.getMetadataKeys(AdminSignupProtectionController) as string[]).map(
      (key) => Reflect.getMetadata(key, AdminSignupProtectionController),
    );
    expect(JSON.stringify(values)).toContain(Permission.ADMIN_SYSTEM_VIEW);
    expect(JSON.stringify(values)).toContain('ADMIN');
  });
});
