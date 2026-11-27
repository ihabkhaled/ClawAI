import { describe, expect, it } from 'vitest';

import { SECURITY_SETTING_FIELDS } from '@/constants/admin-security-settings.constants';
import { EmailCheckTone } from '@/enums/email-check-tone.enum';
import { EmailDomainReason } from '@/enums/email-domain-reason.enum';
import { EmailDomainVerdict } from '@/enums/email-domain-verdict.enum';
import { SecurityKeySource } from '@/enums/security-key-source.enum';
import { SecuritySettingGroup } from '@/enums/security-setting-group.enum';
import { SecuritySettingKey } from '@/enums/security-setting-key.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type {
  SecuritySettingField,
  SignupProtectionStatus,
} from '@/types/admin-security-settings.types';
import {
  buildCaptchaStatusViews,
  describeEmailCheckOutcome,
  formatSecurityCount,
  resolveSecuritySettingPlaceholder,
} from '@/utilities/signup-protection-status.utility';

const fieldOf = (key: SecuritySettingKey): SecuritySettingField => {
  const found = SECURITY_SETTING_FIELDS.find((candidate) => candidate.key === key);
  if (found === undefined) {
    throw new Error(`no field ${key}`);
  }
  return found;
};

const STATUS: SignupProtectionStatus = {
  turnstile: {
    active: true,
    siteKey: '0x4AAA-env',
    siteKeySource: SecurityKeySource.ENVIRONMENT,
    secretKeySource: SecurityKeySource.ENVIRONMENT,
  },
  recaptcha: {
    active: false,
    siteKey: null,
    siteKeySource: SecurityKeySource.NONE,
    secretKeySource: SecurityKeySource.SETTING,
  },
  builtInDisposableDomainCount: 10455,
};

describe('resolveSecuritySettingPlaceholder', () => {
  it('names where the secret in force comes from, whatever the row says', () => {
    expect(
      resolveSecuritySettingPlaceholder(
        fieldOf(SecuritySettingKey.TURNSTILE_SECRET_KEY),
        false,
        STATUS,
      ),
    ).toEqual({ key: 'adminSecurity.fields.secretFromServer' });
    expect(
      resolveSecuritySettingPlaceholder(
        fieldOf(SecuritySettingKey.RECAPTCHA_SECRET_KEY),
        false,
        STATUS,
      ),
    ).toEqual({ key: 'adminSecurity.fields.secretConfigured' });
  });

  it('falls back to the settings row while the status is missing', () => {
    const secret = fieldOf(SecuritySettingKey.TURNSTILE_SECRET_KEY);
    expect(resolveSecuritySettingPlaceholder(secret, true, undefined)).toEqual({
      key: 'adminSecurity.fields.secretConfigured',
    });
    expect(resolveSecuritySettingPlaceholder(secret, false, undefined)).toEqual({
      key: 'adminSecurity.fields.secretNotConfigured',
    });
  });

  it('shows the server site key only when the server supplies it', () => {
    expect(
      resolveSecuritySettingPlaceholder(
        fieldOf(SecuritySettingKey.TURNSTILE_SITE_KEY),
        false,
        STATUS,
      ),
    ).toEqual({
      key: 'adminSecurity.fields.siteKeyFromServer',
      params: { value: '0x4AAA-env' },
    });
    expect(
      resolveSecuritySettingPlaceholder(
        fieldOf(SecuritySettingKey.RECAPTCHA_SITE_KEY),
        false,
        STATUS,
      ),
    ).toBeNull();
    expect(
      resolveSecuritySettingPlaceholder(
        fieldOf(SecuritySettingKey.TURNSTILE_SITE_KEY),
        false,
        undefined,
      ),
    ).toBeNull();
  });

  it('keeps the default placeholder of every other field', () => {
    expect(
      resolveSecuritySettingPlaceholder(fieldOf(SecuritySettingKey.POW_DIFFICULTY), false, STATUS),
    ).toEqual({ key: 'adminSecurity.fields.defaultPlaceholder', params: { value: '18' } });
    expect(
      resolveSecuritySettingPlaceholder(
        fieldOf(SecuritySettingKey.EMAIL_BLOCKED_DOMAINS),
        false,
        STATUS,
      ),
    ).toBeNull();
  });
});

describe('buildCaptchaStatusViews', () => {
  it('is empty until the status loads', () => {
    expect(buildCaptchaStatusViews(undefined)).toEqual({});
  });

  it('describes only the two captcha cards', () => {
    const views = buildCaptchaStatusViews(STATUS);
    expect(Object.keys(views).sort()).toEqual(
      [SecuritySettingGroup.RECAPTCHA, SecuritySettingGroup.TURNSTILE].sort(),
    );
    expect(views[SecuritySettingGroup.RECAPTCHA]).toEqual({
      active: false,
      siteKeySourceKey: 'adminSecurity.status.sourceNone',
      secretKeySourceKey: 'adminSecurity.status.sourceSetting',
    });
  });
});

describe('formatSecurityCount', () => {
  it('groups digits for the reader but keeps Western digits', () => {
    expect(formatSecurityCount(10455, 'en')).toBe('10,455');
    expect(formatSecurityCount(10455, 'de')).toBe('10.455');
    expect(formatSecurityCount(10455, 'ar')).toMatch(/^10\D?455$/u);
    expect(formatSecurityCount(10455, 'fa')).toMatch(/^10\D?455$/u);
  });
});

describe('describeEmailCheckOutcome', () => {
  it('is nothing before the first check', () => {
    expect(describeEmailCheckOutcome(undefined, null)).toBeNull();
  });

  it('reads a verdict by its reason', () => {
    expect(
      describeEmailCheckOutcome(
        {
          domain: 'mailinator.com',
          verdict: EmailDomainVerdict.DISPOSABLE,
          reason: EmailDomainReason.BUILT_IN_LIST,
        },
        null,
      ),
    ).toEqual({
      tone: EmailCheckTone.BLOCKED,
      messageKey: 'adminSecurity.emailCheck.builtInList',
      domain: 'mailinator.com',
    });
  });

  it('tells a 400 apart from any other failure', () => {
    expect(
      describeEmailCheckOutcome(undefined, new ApiClientError({ message: 'bad', status: 400 })),
    ).toEqual({
      tone: EmailCheckTone.ERROR,
      messageKey: 'adminSecurity.emailCheck.invalid',
      domain: null,
    });
    expect(describeEmailCheckOutcome(undefined, new Error('network'))?.messageKey).toBe(
      'adminSecurity.emailCheck.failed',
    );
  });
});
