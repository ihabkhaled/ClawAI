import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { UserRole, UserStatus } from '../../../../common/enums';
import { TokenSessionManager } from '../../managers/token-session.manager';
import { AuthRepository } from '../../repositories/auth.repository';
import { createPkceChallenge } from '../../utilities/vscode-authorization.utility';
import { VscodeAuthorizationService } from '../vscode-authorization.service';

describe('VscodeAuthorizationService', () => {
  const values = new Map<string, string>();
  const redis = {
    set: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    get: jest.fn(async (key: string) => values.get(key) ?? null),
    getClient: jest.fn(() => ({
      getdel: jest.fn(async (key: string) => {
        const value = values.get(key) ?? null;
        values.delete(key);
        return value;
      }),
    })),
  };
  const repository = {
    findUserById: jest.fn(async () => ({
      id: 'user-1',
      email: 'user@example.com',
      username: 'user',
      passwordHash: 'redacted',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
      languagePreference: 'en',
      appearancePreference: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
  const tokens = {
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresIn: 900,
    refreshExpiresIn: 2_592_000,
    tokenType: 'Bearer' as const,
  };
  const tokenSessionManager = {
    issue: jest.fn(async () => tokens),
  };
  let service: VscodeAuthorizationService;

  beforeEach(async () => {
    values.clear();
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        VscodeAuthorizationService,
        { provide: RedisService, useValue: redis },
        { provide: AuthRepository, useValue: repository },
        { provide: TokenSessionManager, useValue: tokenSessionManager },
      ],
    }).compile();
    service = module.get(VscodeAuthorizationService);
  });

  it('issues a one-time standard VS Code session after browser approval and PKCE exchange', async () => {
    const verifier = 'v'.repeat(48);
    const initialized = await service.initialize({
      callbackUri: 'vscode://clawai.clawai-coding-agent/auth/callback',
      clientName: 'ClawAI for VS Code',
      codeChallenge: createPkceChallenge(verifier),
      state: 's'.repeat(43),
    });

    await expect(service.details(initialized.requestId)).resolves.toEqual({
      clientName: 'ClawAI for VS Code',
      expiresIn: 600,
    });
    const approval = await service.approve(initialized.requestId, 'user-1');
    const code = new URL(approval.redirectUri).searchParams.get('code');

    await expect(service.exchange(code ?? '', verifier)).resolves.toEqual({ tokens });
    await expect(service.exchange(code ?? '', verifier)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(tokenSessionManager.issue).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      { kind: 'VSCODE', name: 'ClawAI for VS Code' },
    );
  });

  it('rejects callbacks that cannot return to this extension', async () => {
    await expect(
      service.initialize({
        callbackUri: 'https://evil.example/callback',
        clientName: 'ClawAI for VS Code',
        codeChallenge: 'c'.repeat(43),
        state: 's'.repeat(43),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('consumes a code when the verifier does not match', async () => {
    const initialized = await service.initialize({
      callbackUri: 'vscode://clawai.clawai-coding-agent/auth/callback',
      clientName: 'ClawAI for VS Code',
      codeChallenge: createPkceChallenge('v'.repeat(48)),
      state: 's'.repeat(43),
    });
    const approval = await service.approve(initialized.requestId, 'user-1');
    const code = new URL(approval.redirectUri).searchParams.get('code') ?? '';

    await expect(service.exchange(code, 'x'.repeat(48))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.exchange(code, 'v'.repeat(48))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
