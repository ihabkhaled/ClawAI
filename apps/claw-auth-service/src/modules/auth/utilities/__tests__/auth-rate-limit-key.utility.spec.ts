import { resolveClientAddress } from '@claw/shared-auth';
import { vi } from 'vitest';

import { createHash } from 'node:crypto';

import {
  AUTH_RATE_LIMIT_KEY_PREFIX,
  UNKNOWN_CLIENT_IP,
} from '../../constants/auth-rate-limit.constants';
import { AuthRateLimitPolicy } from '../../enums/auth-rate-limit-policy.enum';
import { AuthRateLimitScope } from '../../enums/auth-rate-limit-scope.enum';
import {
  buildAuthRateLimitKey,
  hashRateLimitPart,
  normalizeRateLimitEmail,
  readRateLimitEmail,
  resolveClientIp,
} from '../auth-rate-limit-key.utility';

vi.mock('@claw/shared-auth', () => ({ resolveClientAddress: vi.fn() }));

const mockedResolve = vi.mocked(resolveClientAddress);

describe('resolveClientIp', () => {
  beforeEach(() => {
    mockedResolve.mockReset();
  });

  it('delegates to the shared resolver, so every limiter keys the same address', async () => {
    mockedResolve.mockResolvedValue({ address: '203.0.113.7', viaProxy: true });
    const headers = { 'x-real-ip': '203.0.113.7' };
    await expect(resolveClientIp(headers, '172.18.0.29')).resolves.toBe('203.0.113.7');
    expect(mockedResolve).toHaveBeenCalledWith(headers, '172.18.0.29');
  });

  it('keys a LAN peer that spoofs X-Real-IP on its own address', async () => {
    mockedResolve.mockResolvedValue({ address: '192.168.1.50', viaProxy: false });
    await expect(resolveClientIp({ 'x-real-ip': '203.0.113.7' }, '192.168.1.50')).resolves.toBe(
      '192.168.1.50',
    );
  });

  it('falls back to the unknown bucket when nothing is usable', async () => {
    mockedResolve.mockResolvedValue(null);
    await expect(resolveClientIp({}, undefined)).resolves.toBe(UNKNOWN_CLIENT_IP);
  });
});

describe('normalizeRateLimitEmail / readRateLimitEmail', () => {
  it('trims and lowercases but keeps +tags and dots', () => {
    expect(normalizeRateLimitEmail('  Ada.Lovelace+QA@Example.COM ')).toBe(
      'ada.lovelace+qa@example.com',
    );
  });

  it('returns null for a blank or non-string value', () => {
    expect(normalizeRateLimitEmail('   ')).toBeNull();
    expect(normalizeRateLimitEmail(42)).toBeNull();
  });

  it('reads the email field from an unvalidated body', () => {
    expect(readRateLimitEmail({ email: 'A@B.io', password: 'x' })).toBe('a@b.io');
    expect(readRateLimitEmail({ refreshToken: 'r' })).toBeNull();
    expect(readRateLimitEmail(null)).toBeNull();
    expect(readRateLimitEmail('email')).toBeNull();
  });
});

describe('buildAuthRateLimitKey', () => {
  const subject = { ip: '203.0.113.7', email: 'ada@example.com' };

  it('hashes the IP into the key', () => {
    const key = buildAuthRateLimitKey(AuthRateLimitPolicy.LOGIN, AuthRateLimitScope.IP, subject);
    expect(key).toBe(
      `${AUTH_RATE_LIMIT_KEY_PREFIX}login:ip:${createHash('sha256')
        .update('203.0.113.7')
        .digest('hex')
        .slice(0, 32)}`,
    );
    expect(key).not.toContain('203.0.113.7');
  });

  it('never stores the address in an email or ip-email key', () => {
    const email = buildAuthRateLimitKey(
      AuthRateLimitPolicy.REGISTER,
      AuthRateLimitScope.EMAIL,
      subject,
    );
    const pair = buildAuthRateLimitKey(
      AuthRateLimitPolicy.LOGIN,
      AuthRateLimitScope.IP_EMAIL,
      subject,
    );
    expect(email).toBe(
      `${AUTH_RATE_LIMIT_KEY_PREFIX}register:email:${hashRateLimitPart('ada@example.com')}`,
    );
    expect(pair).toBe(
      `${AUTH_RATE_LIMIT_KEY_PREFIX}login:ip-email:${hashRateLimitPart(
        '203.0.113.7|ada@example.com',
      )}`,
    );
    expect(`${email}${pair}`).not.toContain('ada');
  });

  it('keeps different addresses and different IPs in different windows', () => {
    const a = buildAuthRateLimitKey(
      AuthRateLimitPolicy.LOGIN,
      AuthRateLimitScope.IP_EMAIL,
      subject,
    );
    const otherEmail = buildAuthRateLimitKey(
      AuthRateLimitPolicy.LOGIN,
      AuthRateLimitScope.IP_EMAIL,
      { ...subject, email: 'admin@claw.local' },
    );
    const otherIp = buildAuthRateLimitKey(AuthRateLimitPolicy.LOGIN, AuthRateLimitScope.IP_EMAIL, {
      ...subject,
      ip: '198.51.100.1',
    });
    expect(new Set([a, otherEmail, otherIp]).size).toBe(3);
  });

  it('skips an address window when the body carried no address', () => {
    const noEmail = { ip: '203.0.113.7', email: null };
    expect(
      buildAuthRateLimitKey(AuthRateLimitPolicy.REGISTER, AuthRateLimitScope.EMAIL, noEmail),
    ).toBeNull();
    expect(
      buildAuthRateLimitKey(AuthRateLimitPolicy.LOGIN, AuthRateLimitScope.IP_EMAIL, noEmail),
    ).toBeNull();
  });
});
