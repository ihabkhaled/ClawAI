import { beforeAll, describe, expect, it, vi } from 'vitest';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { DeviceTokenClass, EventPattern, MobileDeviceScope } from '@claw/shared-types';
import {
  MOBILE_ACCESS_TOKEN_TTL_SECONDS,
  MOBILE_MAX_ACTIVE_DEVICES_PER_USER,
  MOBILE_REFRESH_TOKEN_TTL_DAYS,
} from '@claw/shared-constants';
import { DeviceScope } from '../../../../common/enums/device-scope.enum';
import { useAgentTestConfig } from '../../../../common/testing/agent-test-env';
import { DeviceRepository } from '../../repositories/device.repository';
import { PairingRequestRepository } from '../../repositories/pairing-request.repository';
import { RefreshTokenRepository } from '../../repositories/refresh-token.repository';
import { PairingService } from '../pairing.service';
import { TokenService } from '../token.service';
import type { Device, PairingRequest } from '../../../../generated/prisma';

function stub<T extends object>(
  type: abstract new (...args: never[]) => T,
  members: Partial<T>,
): T {
  return Object.assign(Object.create(type.prototype) as T, members);
}

function pairingRow(overrides: Partial<PairingRequest>): PairingRequest {
  return {
    id: 'pair-1',
    codeHash: 'hash',
    stateNonce: 'nonce',
    deviceHint: null,
    loopbackPort: null,
    status: 'PENDING',
    approvedByUserId: null,
    approvedDeviceId: null,
    approvedScopesCsv: null,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    consumedAt: null,
    ...overrides,
  };
}

const HINT = { hostname: 'iphone', os: 'ios', platform: 'ios', agentVersion: '1.0.0' };

function build(options: { activeMobile?: number } = {}) {
  const created: Array<Record<string, unknown>> = [];
  const refreshCreated: Array<Record<string, unknown>> = [];
  const published: Array<{ pattern: string; payload: Record<string, unknown> }> = [];
  const deviceRow = (data: Record<string, unknown>): Device =>
    ({ id: 'device-1', ...data }) as Device;
  const pairingRepo = stub(PairingRequestRepository, {
    findByCodeHash: vi.fn().mockResolvedValue(pairingRow({ deviceHint: HINT })),
    approve: vi.fn().mockResolvedValue(pairingRow({})),
    markConsumed: vi.fn().mockResolvedValue(undefined),
  });
  const deviceRepo = stub(DeviceRepository, {
    create: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      created.push(data);
      return Promise.resolve(deviceRow(data));
    }),
    countActiveByClass: vi.fn().mockResolvedValue(options.activeMobile ?? 0),
    findById: vi.fn(),
  });
  const refreshRepo = stub(RefreshTokenRepository, {
    create: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      refreshCreated.push(data);
      return Promise.resolve({ id: 'rt-1' });
    }),
  });
  const rabbit = stub(RabbitMQService, {
    publish: vi.fn().mockImplementation((pattern: string, payload: Record<string, unknown>) => {
      published.push({ pattern, payload });
      return Promise.resolve();
    }),
  });
  const service = new PairingService(
    pairingRepo,
    deviceRepo,
    refreshRepo,
    new TokenService(),
    rabbit,
  );
  return { service, deviceRepo, pairingRepo, created, refreshCreated, published };
}

const CODE = 'x'.repeat(50);

describe('PairingService mobile class (F097)', () => {
  beforeAll(() => useAgentTestConfig());

  it('pairs a mobile device with the mobile class and announces it', async () => {
    const { service, created, published } = build();
    await service.approve(
      'user-1',
      CODE,
      [MobileDeviceScope.RUNS_READ, MobileDeviceScope.RUNS_APPROVE],
      'My phone',
      DeviceTokenClass.MOBILE,
    );
    expect(created[0]).toMatchObject({ tokenClass: 'mobile', scopesCsv: 'runs:read,runs:approve' });
    const paired = published.find((e) => e.pattern === EventPattern.AGENT_DEVICE_PAIRED);
    expect(paired?.payload).toMatchObject({ tokenClass: 'mobile', userId: 'user-1' });
  });

  it('keeps the desktop class when none is given', async () => {
    const { service, created } = build();
    await service.approve('user-1', CODE, [DeviceScope.SHELL_EXEC], undefined);
    expect(created[0]).toMatchObject({ tokenClass: 'device' });
  });

  it('refuses a mobile pairing that asks for any non-mobile scope, creating nothing', async () => {
    const { service, created } = build();
    for (const scopes of [
      [DeviceScope.SHELL_EXEC],
      [MobileDeviceScope.RUNS_READ, DeviceScope.SHELL_EXEC],
      [DeviceScope.SCHEDULE_WRITE, DeviceScope.REPOS_WRITE],
      [],
    ]) {
      await expect(
        service.approve('user-1', CODE, scopes, undefined, DeviceTokenClass.MOBILE),
      ).rejects.toMatchObject({ status: 400 });
    }
    expect(created).toEqual([]);
  });

  it('refuses a desktop pairing that asks for a run scope', async () => {
    const { service, created } = build();
    await expect(
      service.approve('user-1', CODE, [MobileDeviceScope.RUNS_APPROVE], undefined),
    ).rejects.toMatchObject({ status: 400 });
    expect(created).toEqual([]);
  });

  it('refuses a mobile pairing past the per-user device cap', async () => {
    const { service, created } = build({ activeMobile: MOBILE_MAX_ACTIVE_DEVICES_PER_USER });
    await expect(
      service.approve(
        'user-1',
        CODE,
        [MobileDeviceScope.RUNS_READ],
        undefined,
        DeviceTokenClass.MOBILE,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(created).toEqual([]);
  });

  it('issues a short-lived mobile access token and a bounded refresh token on poll', async () => {
    const { service, pairingRepo, deviceRepo, refreshCreated } = build();
    vi.mocked(pairingRepo.findByCodeHash).mockResolvedValue(
      pairingRow({
        status: 'APPROVED',
        approvedDeviceId: 'device-1',
        approvedByUserId: 'user-1',
        approvedScopesCsv: 'runs:read',
      }),
    );
    vi.mocked(deviceRepo.findById).mockResolvedValue({
      id: 'device-1',
      tokenClass: 'mobile',
    } as Device);
    const result = await service.poll(CODE, '1.2.3.4');
    expect(result.status).toBe('approved');
    expect(result.tokens?.expiresIn).toBeLessThanOrEqual(MOBILE_ACCESS_TOKEN_TTL_SECONDS);
    const expiresAt = refreshCreated[0]?.['expiresAt'] as Date;
    const days = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1_000);
    expect(days).toBeLessThanOrEqual(MOBILE_REFRESH_TOKEN_TTL_DAYS);
    expect(new TokenService().verifyAccess(result.tokens?.accessToken ?? '')?.tokenClass).toBe(
      DeviceTokenClass.MOBILE,
    );
  });

  it('does not issue tokens for an approved pairing whose device row has an unknown class', async () => {
    const { service, pairingRepo, deviceRepo } = build();
    vi.mocked(pairingRepo.findByCodeHash).mockResolvedValue(
      pairingRow({
        status: 'APPROVED',
        approvedDeviceId: 'device-1',
        approvedByUserId: 'user-1',
        approvedScopesCsv: 'runs:read',
      }),
    );
    vi.mocked(deviceRepo.findById).mockResolvedValue({
      id: 'device-1',
      tokenClass: 'root',
    } as Device);
    await expect(service.poll(CODE, null)).resolves.toEqual({ status: 'expired' });
  });
});
