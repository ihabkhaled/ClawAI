import { vi, type Mock } from 'vitest';
import { InvalidCredentialsException } from '../../../../common/errors';
import { UserRole, UserStatus } from '../../../../common/enums';
import { DeviceAuthorizationStatus } from '../../enums/device-authorization-status.enum';
import type { AuthRepository } from '../../repositories/auth.repository';
import type { DeviceAuthorizationRepository } from '../../repositories/device-authorization.repository';
import type { TokenSessionManager } from '../token-session.manager';
import { DeviceAuthorizationManager } from '../device-authorization.manager';

vi.mock('@claw/shared-utilities', () => ({
  hashBearerToken: vi.fn().mockReturnValue('device-code-digest'),
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn().mockReturnValue({
      JWT_SECRET: 'test-secret-key-that-is-long-enough',
    }),
  },
}));

const activeUser = {
  id: 'user-1',
  email: 'user@example.com',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
};

const grant = {
  id: 'grant-1',
  deviceCodeHash: 'device-code-digest',
  userCode: 'ABCD-EFGH',
  clientName: 'VS Code',
  clientVersion: '1.0.0',
  status: DeviceAuthorizationStatus.PENDING,
  approvedByUserId: null,
  intervalSeconds: 5,
  lastPolledAt: null,
  pollViolationCount: 0,
  expiresAt: new Date('2099-01-01T00:00:00.000Z'),
  approvedAt: null,
  deniedAt: null,
  consumedAt: null,
  createdAt: new Date('2026-07-27T00:00:00.000Z'),
  updatedAt: new Date('2026-07-27T00:00:00.000Z'),
};

describe('DeviceAuthorizationManager', () => {
  let deviceRepository: {
    create: Mock;
    findByDeviceCodeHash: Mock;
    approve: Mock;
    deny: Mock;
    recordPoll: Mock;
    slowDown: Mock;
    consume: Mock;
  };
  let authRepository: { findUserById: Mock };
  let tokenSessionManager: { issue: Mock };
  let manager: DeviceAuthorizationManager;

  beforeEach(() => {
    deviceRepository = {
      create: vi.fn().mockResolvedValue(grant),
      findByDeviceCodeHash: vi.fn().mockResolvedValue(grant),
      approve: vi.fn().mockResolvedValue(true),
      deny: vi.fn().mockResolvedValue(true),
      recordPoll: vi.fn().mockResolvedValue(true),
      slowDown: vi.fn().mockResolvedValue(10),
      consume: vi.fn().mockResolvedValue(true),
    };
    authRepository = {
      findUserById: vi.fn().mockResolvedValue(activeUser),
    };
    tokenSessionManager = {
      issue: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        refreshExpiresIn: 604_800,
        tokenType: 'Bearer',
      }),
    };
    manager = new DeviceAuthorizationManager(
      deviceRepository as unknown as DeviceAuthorizationRepository,
      authRepository as unknown as AuthRepository,
      tokenSessionManager as unknown as TokenSessionManager,
    );
  });

  it('stores only a digest of the device code', async () => {
    const result = await manager.create({
      name: 'VS Code',
      version: '1.0.0',
    });

    expect(deviceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ deviceCodeHash: 'device-code-digest' }),
    );
    expect(deviceRepository.create.mock.calls[0]?.[0]).not.toHaveProperty('deviceCode');
    expect(result.deviceCode).not.toBe('device-code-digest');
  });

  it('returns authorization_pending before approval', async () => {
    await expect(manager.exchange('device-code')).resolves.toEqual({
      error: 'authorization_pending',
    });
  });

  it('returns slow_down and increases the interval after an early poll', async () => {
    deviceRepository.findByDeviceCodeHash.mockResolvedValue({
      ...grant,
      lastPolledAt: new Date(),
    });

    await expect(manager.exchange('device-code')).resolves.toEqual({
      error: 'slow_down',
      interval: 10,
    });
  });

  it('exchanges an approved code exactly once', async () => {
    deviceRepository.findByDeviceCodeHash.mockResolvedValue({
      ...grant,
      status: DeviceAuthorizationStatus.APPROVED,
      approvedByUserId: activeUser.id,
    });

    const result = await manager.exchange('device-code');

    expect(deviceRepository.consume).toHaveBeenCalledWith(grant.id, expect.any(Date));
    expect(tokenSessionManager.issue).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({ accessToken: 'access-token' }));
  });

  it('returns access_denied after denial', async () => {
    deviceRepository.findByDeviceCodeHash.mockResolvedValue({
      ...grant,
      status: DeviceAuthorizationStatus.DENIED,
    });

    await expect(manager.exchange('device-code')).resolves.toEqual({
      error: 'access_denied',
    });
  });

  it('returns expired_token after expiry', async () => {
    deviceRepository.findByDeviceCodeHash.mockResolvedValue({
      ...grant,
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    await expect(manager.exchange('device-code')).resolves.toEqual({
      error: 'expired_token',
    });
  });

  it('rejects approval by a suspended user', async () => {
    authRepository.findUserById.mockResolvedValue({
      ...activeUser,
      status: UserStatus.SUSPENDED,
    });

    await expect(manager.approve(activeUser.id, grant.userCode)).rejects.toThrow(
      InvalidCredentialsException,
    );
    expect(deviceRepository.approve).not.toHaveBeenCalled();
  });
});
