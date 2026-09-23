import { HttpStatus } from '@nestjs/common';
import { vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { BusinessException } from '../../../../common/errors';
import { UserRole } from '../../../../common/enums';
import { deriveScopedKey, signScopedToken } from '../../../../common/utilities';
import type { RedisService } from '../../../../infrastructure/redis/redis.service';
import { GRAFANA_ACCESS_KEY_CONTEXT } from '../../constants/grafana-access.constants';
import { GrafanaAccessService } from '../grafana-access.service';

const SECRET = 'grafana-spec-jwt-secret-that-is-at-least-32-chars';
const ADMIN = {
  id: 'admin-1',
  email: 'ops@claw.local',
  role: UserRole.ADMIN,
  sessionId: 'session-1',
};

function build(options: { accessExpiry?: string; revoked?: string[]; redisDown?: boolean } = {}) {
  vi.spyOn(AppConfig, 'get').mockReturnValue({
    JWT_SECRET: SECRET,
    JWT_ACCESS_EXPIRY: options.accessExpiry ?? '15m',
  } as ReturnType<typeof AppConfig.get>);
  const revoked = new Set((options.revoked ?? []).map((sid) => `auth:revoked-session:${sid}`));
  const get = vi.fn(async (key: string) => {
    if (options.redisDown === true) {
      throw new Error('ECONNREFUSED');
    }
    return revoked.has(key) ? '1' : null;
  });
  const redis: Pick<RedisService, 'get'> = { get };
  return { service: new GrafanaAccessService(redis as RedisService), get };
}

const cookie = (token: string): string => `theme=dark; claw_grafana=${token}`;

async function expectDenied(promise: Promise<unknown>): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(BusinessException);
  await expect(promise).rejects.toMatchObject({
    status: HttpStatus.UNAUTHORIZED,
    code: 'GRAFANA_ACCESS_DENIED',
  });
}

describe('GrafanaAccessService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('grant', () => {
    it('mints a cookie that expires with the capped lifetime', () => {
      const { service } = build();
      const now = new Date('2026-09-23T10:00:00.000Z');
      const grant = service.grant(ADMIN, now);
      expect(grant.maxAgeSeconds).toBe(900);
      expect(grant.expiresAt).toBe('2026-09-23T10:15:00.000Z');
      expect(grant.token.split('.')).toHaveLength(3);
    });

    // Redis remembers a revoked session for one access-token lifetime. A cookie
    // that lived longer would outlive its own revocation.
    it.each([
      ['5m', 300],
      ['15m', 900],
      ['1h', 900],
      ['7d', 900],
    ])('never outlives the access token (%s → %is)', (expiry, seconds) => {
      const { service } = build({ accessExpiry: expiry });
      expect(service.lifetimeSeconds()).toBe(seconds);
    });
  });

  describe('verify', () => {
    it('names the admin a freshly minted cookie belongs to', async () => {
      const { service, get } = build();
      const { token } = service.grant(ADMIN);
      await expect(service.verify(cookie(token))).resolves.toEqual({ email: 'ops@claw.local' });
      expect(get).toHaveBeenCalledWith('auth:revoked-session:session-1');
    });

    it('refuses when there is no cookie at all (signed-out browser)', async () => {
      const { service } = build();
      await expectDenied(service.verify(undefined));
      await expectDenied(service.verify('theme=dark'));
    });

    // Sign-out revokes the session; the cookie must stop working with it.
    it('refuses a cookie whose session was revoked', async () => {
      const { service } = build({ revoked: ['session-1'] });
      const { token } = service.grant(ADMIN);
      await expectDenied(service.verify(cookie(token)));
    });

    it('refuses a tampered cookie', async () => {
      const { service } = build();
      const { token } = service.grant(ADMIN);
      const [header, , signature] = token.split('.');
      const forged = Buffer.from(
        JSON.stringify({ sub: 'x', email: 'evil@x.co', sid: 's' }),
      ).toString('base64url');
      await expectDenied(
        service.verify(cookie(`${String(header)}.${forged}.${String(signature)}`)),
      );
    });

    it('refuses an expired cookie', async () => {
      const { service } = build();
      const expired = signScopedToken(
        { sub: 'admin-1', email: 'ops@claw.local', sid: 'session-1' },
        deriveScopedKey(SECRET, GRAFANA_ACCESS_KEY_CONTEXT),
        { audience: 'claw-grafana', issuer: 'claw-auth-service', expiresInSeconds: -5 },
      );
      await expectDenied(service.verify(cookie(expired)));
    });

    it('refuses a correctly signed cookie with no session id', async () => {
      const { service } = build();
      const sessionless = signScopedToken(
        { sub: 'admin-1', email: 'ops@claw.local' },
        deriveScopedKey(SECRET, GRAFANA_ACCESS_KEY_CONTEXT),
        { audience: 'claw-grafana', issuer: 'claw-auth-service', expiresInSeconds: 60 },
      );
      await expectDenied(service.verify(cookie(sessionless)));
    });

    it('refuses a cookie minted under a different JWT_SECRET (rotation signs everyone out)', async () => {
      const { service } = build();
      const foreign = signScopedToken(
        { sub: 'admin-1', email: 'ops@claw.local', sid: 'session-1' },
        deriveScopedKey('another-secret-that-is-also-long-enough-000', GRAFANA_ACCESS_KEY_CONTEXT),
        { audience: 'claw-grafana', issuer: 'claw-auth-service', expiresInSeconds: 60 },
      );
      await expectDenied(service.verify(cookie(foreign)));
    });

    // ADR-112: an unreadable revocation cache must not lock operators out of
    // the tool they open during an incident.
    it('fails open when Redis cannot be read', async () => {
      const { service } = build({ redisDown: true });
      const { token } = service.grant(ADMIN);
      await expect(service.verify(cookie(token))).resolves.toEqual({ email: 'ops@claw.local' });
    });
  });
});
