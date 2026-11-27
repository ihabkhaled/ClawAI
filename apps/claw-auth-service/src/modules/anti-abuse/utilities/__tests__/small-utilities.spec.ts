import { HttpStatus } from '@nestjs/common';

import { NULL_MX_EXCHANGES } from '../../constants/anti-abuse.constants';
import { BotCheckOutcome } from '../../enums/bot-check-outcome.enum';
import { DnsLookupStatus } from '../../enums/dns-lookup-status.enum';
import { EmailDomainVerdict } from '../../enums/email-domain-verdict.enum';
import {
  loginFailureEmailKey,
  loginFailureIpKey,
  powClaimKey,
  signupDeviceKeys,
} from '../anti-abuse-key.utility';
import {
  botCheckRefusal,
  emailDomainRefusal,
  signupLimitedRefusal,
} from '../anti-abuse-refusal.utility';
import { fingerprintLogPrefix, hashDevice, hashDeviceValue } from '../device-hash.utility';
import { classifyDnsError, isNullMx } from '../dns-error.utility';
import {
  parseBoundedInteger,
  parseBoundedNumber,
  resolveKey,
  toCaptchaKeys,
} from '../security-setting-parse.utility';
import { screeningOriginOf } from '../screening-origin.utility';

describe('anti-abuse refusals', () => {
  it('maps a missing check to 428 and a failed one to 403', () => {
    const required = botCheckRefusal(BotCheckOutcome.REQUIRED);
    const failed = botCheckRefusal(BotCheckOutcome.FAILED);
    expect([required.code, required.getStatus()]).toEqual([
      'BOT_CHECK_REQUIRED',
      HttpStatus.PRECONDITION_REQUIRED,
    ]);
    expect([failed.code, failed.getStatus()]).toEqual(['BOT_CHECK_FAILED', HttpStatus.FORBIDDEN]);
  });

  it('marks both email refusals as a 400 on the email field', () => {
    const disposable = emailDomainRefusal(EmailDomainVerdict.DISPOSABLE);
    const undeliverable = emailDomainRefusal(EmailDomainVerdict.UNDELIVERABLE);
    expect(disposable.code).toBe('DISPOSABLE_EMAIL');
    expect(undeliverable.code).toBe('EMAIL_DOMAIN_UNDELIVERABLE');
    expect(disposable.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(disposable.getResponse()).toMatchObject({ details: { field: 'email' } });
  });

  it('carries the wait of a velocity refusal', () => {
    const limited = signupLimitedRefusal(120);
    expect(limited.code).toBe('SIGNUP_TEMPORARILY_LIMITED');
    expect(limited.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(limited.getResponse()).toMatchObject({ details: { retryAfterSeconds: 120 } });
  });
});

describe('device hashing', () => {
  const device = { fingerprint: 'AB'.repeat(32), deviceId: 'device-0001' };

  it('peppers both values and never returns a raw one', () => {
    const hashed = hashDevice(device, 'pepper-1');
    expect(hashed?.fingerprintHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(hashed?.fingerprintHash).not.toContain('abab');
    expect(hashed?.deviceIdHash).toBe(hashDeviceValue('device-0001', 'pepper-1'));
    expect(hashDevice(device, 'pepper-2')?.fingerprintHash).not.toBe(hashed?.fingerprintHash);
  });

  it('hashes the fingerprint case-insensitively', () => {
    const lower = hashDevice({ ...device, fingerprint: device.fingerprint.toLowerCase() }, 'p');
    expect(lower?.fingerprintHash).toBe(hashDevice(device, 'p')?.fingerprintHash);
  });

  it('answers null without a device and logs only an 8-character prefix', () => {
    expect(hashDevice(undefined, 'p')).toBeNull();
    expect(fingerprintLogPrefix('0123456789abcdef')).toBe('01234567');
    expect(fingerprintLogPrefix(null)).toBeNull();
  });
});

describe('redis keys', () => {
  it('never carries an address or an IP in clear', () => {
    const keys = [loginFailureEmailKey(' Bot@Example.com '), loginFailureIpKey('203.0.113.9')];
    expect(keys.join(' ')).not.toMatch(/example|203\.0/iu);
    expect(loginFailureEmailKey('bot@example.com')).toBe(loginFailureEmailKey(' BOT@example.com'));
    expect(loginFailureIpKey(null)).toBeNull();
  });

  it('builds the pow claim and the two device windows', () => {
    expect(powClaimKey('abc')).toBe('auth:abuse:pow:abc');
    expect(signupDeviceKeys({ fingerprintHash: 'f1', deviceIdHash: 'd1' })).toEqual([
      'auth:abuse:signup:fp:f1',
      'auth:abuse:signup:did:d1',
    ]);
  });
});

describe('dns error classification', () => {
  it('treats only ENOTFOUND and ENODATA as evidence', () => {
    expect(classifyDnsError({ code: 'ENOTFOUND' })).toBe(DnsLookupStatus.NXDOMAIN);
    expect(classifyDnsError({ code: 'ENODATA' })).toBe(DnsLookupStatus.NO_RECORDS);
    expect(classifyDnsError({ code: 'ETIMEOUT' })).toBe(DnsLookupStatus.UNKNOWN);
    expect(classifyDnsError({ code: 'ESERVFAIL' })).toBe(DnsLookupStatus.UNKNOWN);
    expect(classifyDnsError(new Error('boom'))).toBe(DnsLookupStatus.UNKNOWN);
  });

  it('recognises an RFC 7505 null MX', () => {
    expect(isNullMx(['.'], NULL_MX_EXCHANGES)).toBe(true);
    expect(isNullMx([''], NULL_MX_EXCHANGES)).toBe(true);
    expect(isNullMx(['mx.example.com'], NULL_MX_EXCHANGES)).toBe(false);
    expect(isNullMx([], NULL_MX_EXCHANGES)).toBe(false);
  });
});

describe('security setting parsing', () => {
  it('keeps an integer in bounds and defaults everything else', () => {
    expect(parseBoundedInteger('20', 12, 24, 18)).toBe(20);
    expect(parseBoundedInteger(' 12 ', 12, 24, 18)).toBe(12);
    expect(parseBoundedInteger('25', 12, 24, 18)).toBe(18);
    expect(parseBoundedInteger('18.5', 12, 24, 18)).toBe(18);
    expect(parseBoundedInteger('abc', 12, 24, 18)).toBe(18);
    expect(parseBoundedInteger('', 12, 24, 18)).toBe(18);
    expect(parseBoundedInteger(null, 12, 24, 18)).toBe(18);
  });

  it('keeps a decimal in bounds and defaults everything else', () => {
    expect(parseBoundedNumber('0.7', 0, 1, 0.5)).toBe(0.7);
    expect(parseBoundedNumber('0', 0, 1, 0.5)).toBe(0);
    expect(parseBoundedNumber('1.5', 0, 1, 0.5)).toBe(0.5);
    expect(parseBoundedNumber(' ', 0, 1, 0.5)).toBe(0.5);
    expect(parseBoundedNumber(null, 0, 1, 0.5)).toBe(0.5);
  });

  it('prefers a non-empty stored key, then the environment', () => {
    expect(resolveKey(' stored ', 'env')).toBe('stored');
    expect(resolveKey('  ', ' env ')).toBe('env');
    expect(resolveKey(null, undefined)).toBe('');
  });

  it('turns a provider on only with both keys', () => {
    expect(toCaptchaKeys('site', 'secret')).toEqual({ siteKey: 'site', secretKey: 'secret' });
    expect(toCaptchaKeys('site', '')).toBeNull();
    expect(toCaptchaKeys('', 'secret')).toBeNull();
  });
});

describe('screening origin', () => {
  it('reads ip, country and agent off a session origin', () => {
    expect(
      screeningOriginOf({
        ipAddress: '198.51.100.1',
        countryCode: 'US',
        userAgent: 'curl/8',
        os: null,
        browser: null,
        deviceKind: null,
      }),
    ).toEqual({ ip: '198.51.100.1', countryCode: 'US', userAgent: 'curl/8' });
    expect(screeningOriginOf(undefined)).toEqual({ ip: null, countryCode: null, userAgent: null });
  });
});
