import { Test, type TestingModule } from '@nestjs/testing';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { AuthService } from '../auth.service';
import { AuthManager } from '../../managers/auth.manager';
import { UserRole } from '../../../../common/enums';
import { SessionClientKind } from '../../enums/session-client-kind.enum';
import { EmailVerificationService } from '../email-verification.service';

describe('AuthService', () => {
  let service: AuthService;
  let managerMock: jest.Mocked<{
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    getProfile: jest.Mock;
  }>;
  let rabbitMock: jest.Mocked<{ publish: jest.Mock }>;

  beforeEach(async () => {
    managerMock = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    };
    rabbitMock = { publish: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthManager, useValue: managerMock },
        { provide: RabbitMQService, useValue: rabbitMock },
        { provide: EmailVerificationService, useValue: { sendForUser: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('returns the manager result and publishes USER_LOGIN', async () => {
      const result = {
        accessToken: 'a',
        refreshToken: 'r',
        user: { id: 'u1', email: 'a@b', role: UserRole.OPERATOR },
      };
      managerMock.login.mockResolvedValue(result);

      const out = await service.login('a@b', 'p');

      expect(out).toBe(result);
      expect(managerMock.login).toHaveBeenCalledWith('a@b', 'p', {
        kind: SessionClientKind.WEB,
        name: 'ClawAI Web',
      });
      expect(rabbitMock.publish).toHaveBeenCalledWith(
        EventPattern.USER_LOGIN,
        expect.objectContaining({ userId: 'u1', email: 'a@b' }),
      );
    });

    it('rethrows manager errors and does not publish USER_LOGIN', async () => {
      managerMock.login.mockRejectedValue(new Error('bad creds'));
      await expect(service.login('a@b', 'wrong')).rejects.toThrow('bad creds');
      // structured logger may publish log.server events on failure;
      // assert ONLY that USER_LOGIN was not published
      const userLoginCalls = rabbitMock.publish.mock.calls.filter(
        (c) => c[0] === EventPattern.USER_LOGIN,
      );
      expect(userLoginCalls).toHaveLength(0);
    });

    it('passes client provenance to the manager', async () => {
      managerMock.login.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        user: { id: 'u1', email: 'a@b', role: UserRole.OPERATOR },
      });
      const client = {
        kind: SessionClientKind.VSCODE,
        name: 'ClawAI for VS Code',
      };

      await service.login('a@b', 'p', client);

      expect(managerMock.login).toHaveBeenCalledWith('a@b', 'p', client);
    });
  });

  describe('refresh', () => {
    it('returns new tokens from manager', async () => {
      const result = { accessToken: 'new-a', refreshToken: 'new-r' };
      managerMock.refresh.mockResolvedValue(result);
      const out = await service.refresh('old-r');
      expect(out).toBe(result);
      expect(managerMock.refresh).toHaveBeenCalledWith('old-r');
    });
  });

  describe('logout', () => {
    it('delegates to manager and publishes USER_LOGOUT', async () => {
      await service.logout('u1', 'session-1');
      expect(managerMock.logout).toHaveBeenCalledWith('u1', 'session-1');
      expect(rabbitMock.publish).toHaveBeenCalledWith(
        EventPattern.USER_LOGOUT,
        expect.objectContaining({ userId: 'u1' }),
      );
    });
  });

  describe('getProfile', () => {
    it('returns profile from manager', async () => {
      const profile = { id: 'u1', email: 'a@b' };
      managerMock.getProfile.mockResolvedValue(profile);
      const out = await service.getProfile('u1');
      expect(out).toBe(profile);
    });
  });
});
