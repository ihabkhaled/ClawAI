import { beforeAll, describe, expect, it, vi } from 'vitest';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { DeviceTokenClass, EventPattern } from '@claw/shared-types';
import {
  MOBILE_ACCESS_TOKEN_TTL_SECONDS,
  MOBILE_DEVICE_MAX_AGE_DAYS,
  MOBILE_REFRESH_TOKEN_TTL_DAYS,
} from '@claw/shared-constants';
import { useAgentTestConfig } from '../../../../common/testing/agent-test-env';
import { DeviceRepository } from '../../repositories/device.repository';
import { RefreshTokenRepository } from '../../repositories/refresh-token.repository';
import { RefreshService } from '../refresh.service';
import { RevocationCacheService } from '../revocation-cache.service';
import { TokenService } from '../token.service';
import type { Device, RefreshToken } from '../../../../generated/prisma';

function stub<T extends object>(
  type: abstract new (...args: never[]) => T,
  members: Partial<T>,
): T {
  return Object.assign(Object.create(type.prototype) as T, members);
}

const DAY_MS = 24 * 60 * 60 * 1_000;

function device(overrides: Partial<Device>): Device {
  return {
    id: 'device-1',
    userId: 'user-1',
    orgId: null,
    scopesCsv: 'runs:read,runs:approve',
    tokenClass: 'mobile',
    status: 'ACTIVE',
    createdAt: new Date(),
    ...overrides,
  } as Device;
}

function build(row: Device, stored: Partial<RefreshToken> = {}) {
  const published: Array<{ pattern: string; payload: Record<string, unknown> }> = [];
  const created: Array<Record<string, unknown>> = [];
  const refreshRepo = stub(RefreshTokenRepository, {
    findByHash: vi.fn().mockResolvedValue({
      id: 'rt-0',
      deviceId: 'device-1',
      jti: 'jti-0',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + DAY_MS),
      ...stored,
    } as RefreshToken),
    create: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      created.push(data);
      return Promise.resolve({ id: 'rt-1' });
    }),
    markUsed: vi.fn().mockResolvedValue(undefined),
    revokeAllForDevice: vi.fn().mockResolvedValue(undefined),
  });
  const deviceRepo = stub(DeviceRepository, {
    findById: vi.fn().mockResolvedValue(row),
    findByIdForUser: vi.fn().mockResolvedValue(row),
    updateLastSeen: vi.fn().mockResolvedValue(undefined),
    markRevoked: vi.fn().mockResolvedValue(row),
  });
  const cache = stub(RevocationCacheService, {
    revokeDevice: vi.fn().mockResolvedValue(undefined),
  });
  const rabbit = stub(RabbitMQService, {
    publish: vi.fn().mockImplementation((pattern: string, payload: Record<string, unknown>) => {
      published.push({ pattern, payload });
      return Promise.resolve();
    }),
  });
  const tokens = new TokenService();
  return {
    service: new RefreshService(refreshRepo, deviceRepo, tokens, cache, rabbit),
    tokens,
    created,
    published,
  };
}

describe('RefreshService mobile class (F097)', () => {
  beforeAll(() => useAgentTestConfig());

  it('rotates a mobile device into a mobile token with the mobile lifetimes', async () => {
    const { service, tokens, created } = build(device({}));
    const pair = await service.refresh('presented', null);
    const claims = tokens.verifyAccess(pair.accessToken);
    expect(claims?.tokenClass).toBe(DeviceTokenClass.MOBILE);
    expect(claims?.scopes).toEqual(['runs:read', 'runs:approve']);
    expect(pair.expiresIn).toBeLessThanOrEqual(MOBILE_ACCESS_TOKEN_TTL_SECONDS);
    const days = ((created[0]?.['expiresAt'] as Date).getTime() - Date.now()) / DAY_MS;
    expect(days).toBeLessThanOrEqual(MOBILE_REFRESH_TOKEN_TTL_DAYS);
  });

  it('rotates a desktop device with the configured desktop lifetimes, unchanged', async () => {
    const { service, tokens, created } = build(
      device({ tokenClass: 'device', scopesCsv: 'shell:exec' }),
    );
    const pair = await service.refresh('presented', null);
    expect(tokens.verifyAccess(pair.accessToken)?.tokenClass).toBe(DeviceTokenClass.DEVICE);
    expect(pair.expiresIn).toBe(900);
    const days = ((created[0]?.['expiresAt'] as Date).getTime() - Date.now()) / DAY_MS;
    expect(days).toBeGreaterThan(MOBILE_REFRESH_TOKEN_TTL_DAYS);
  });

  it('forces a re-pair once a mobile device passes its absolute lifetime', async () => {
    const old = new Date(Date.now() - (MOBILE_DEVICE_MAX_AGE_DAYS + 1) * DAY_MS);
    const { service } = build(device({ createdAt: old }));
    await expect(service.refresh('presented', null)).rejects.toMatchObject({ status: 401 });
  });

  it('refuses to refresh a device whose class is not one of ours', async () => {
    const { service } = build(device({ tokenClass: 'root' }));
    await expect(service.refresh('presented', null)).rejects.toMatchObject({ status: 401 });
  });

  it('revokes a mobile device on refresh reuse and says it was a mobile one', async () => {
    const { service, published } = build(device({}), { status: 'USED' });
    await expect(service.refresh('presented', '1.2.3.4')).rejects.toMatchObject({ status: 401 });
    const revoked = published.find((e) => e.pattern === EventPattern.AGENT_DEVICE_REVOKED);
    expect(revoked?.payload).toMatchObject({
      tokenClass: 'mobile',
      reason: 'refresh_reuse_detected',
    });
  });

  it('revokes a mobile device on the owner request, per device, and audits its class', async () => {
    const { service, published } = build(device({}));
    await service.revokeDevice('user-1', 'device-1', 'lost phone');
    const revoked = published.find((e) => e.pattern === EventPattern.AGENT_DEVICE_REVOKED);
    expect(revoked?.payload).toMatchObject({
      deviceId: 'device-1',
      tokenClass: 'mobile',
      revokedByUserId: 'user-1',
    });
  });
});
