import { InvalidRefreshTokenException } from '../../../../common/errors';
import { UserRole, UserStatus } from '../../../../common/enums';
import { SessionClientKind } from '../../enums/session-client-kind.enum';
import { type AuthRepository } from '../../repositories/auth.repository';
import { TokenSessionManager } from '../token-session.manager';

jest.mock('@common/utilities', () => ({
  signAccessToken: jest.fn().mockReturnValue('access-token'),
  signRefreshToken: jest.fn().mockReturnValue('raw-refresh-token'),
}));

jest.mock('@claw/shared-utilities', () => ({
  hashBearerToken: jest.fn().mockReturnValue('refresh-digest'),
}));

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn().mockReturnValue({
      JWT_SECRET: 'test-secret-key-that-is-long-enough',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
    }),
  },
}));

const userFixture = {
  id: 'user-1',
  email: 'user@example.com',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
};

const sessionFixture = {
  id: 'session-1',
  userId: userFixture.id,
  refreshTokenHash: 'refresh-digest',
  familyId: 'family-1',
  clientKind: SessionClientKind.VSCODE,
  clientName: 'VS Code',
  usedAt: null,
  revokedAt: null,
  replacedBySessionId: null,
  expiresAt: new Date('2099-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-07-27T00:00:00.000Z'),
  updatedAt: new Date('2026-07-27T00:00:00.000Z'),
};

describe('TokenSessionManager', () => {
  let repository: {
    createSession: jest.Mock;
    findSessionByRefreshTokenHash: jest.Mock;
    findUserById: jest.Mock;
    rotateSession: jest.Mock;
    revokeSessionFamily: jest.Mock;
    revokeSessionForUser: jest.Mock;
  };
  let manager: TokenSessionManager;

  beforeEach(() => {
    repository = {
      createSession: jest.fn().mockResolvedValue(sessionFixture),
      findSessionByRefreshTokenHash: jest.fn(),
      findUserById: jest.fn().mockResolvedValue(userFixture),
      rotateSession: jest.fn().mockResolvedValue({
        ...sessionFixture,
        id: 'session-2',
      }),
      revokeSessionFamily: jest.fn().mockResolvedValue(1),
      revokeSessionForUser: jest.fn().mockResolvedValue(1),
    };
    manager = new TokenSessionManager(repository as unknown as AuthRepository);
  });

  it('stores only the refresh-token digest and binds the access token to the session', async () => {
    const result = await manager.issue(userFixture, {
      kind: SessionClientKind.VSCODE,
      name: 'VS Code',
    });

    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshTokenHash: 'refresh-digest',
        clientKind: SessionClientKind.VSCODE,
      }),
    );
    expect(repository.createSession.mock.calls[0]?.[0]).not.toHaveProperty('refreshToken');
    expect(repository.createSession.mock.calls[0]?.[0].refreshTokenHash).not.toContain(
      result.refreshToken,
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'raw-refresh-token',
      expiresIn: 900,
      refreshExpiresIn: 604_800,
      tokenType: 'Bearer',
    });
  });

  it('rotates an unused refresh token in one repository operation', async () => {
    repository.findSessionByRefreshTokenHash.mockResolvedValue(sessionFixture);

    const result = await manager.rotate('raw-refresh-token');

    expect(repository.rotateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        currentSessionId: sessionFixture.id,
        replacement: expect.objectContaining({
          familyId: sessionFixture.familyId,
          refreshTokenHash: 'refresh-digest',
        }),
      }),
    );
    expect(result.accessToken).toBe('access-token');
  });

  it('revokes the token family when a used refresh token is replayed', async () => {
    repository.findSessionByRefreshTokenHash.mockResolvedValue({
      ...sessionFixture,
      usedAt: new Date(),
    });

    await expect(manager.rotate('raw-refresh-token')).rejects.toThrow(InvalidRefreshTokenException);
    expect(repository.revokeSessionFamily).toHaveBeenCalledWith(sessionFixture.familyId);
  });

  it('revokes the token family when the refresh token is expired', async () => {
    repository.findSessionByRefreshTokenHash.mockResolvedValue({
      ...sessionFixture,
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    await expect(manager.rotate('raw-refresh-token')).rejects.toThrow(InvalidRefreshTokenException);
    expect(repository.revokeSessionFamily).toHaveBeenCalledWith(sessionFixture.familyId);
  });

  it('revokes the token family when concurrent rotation consumed the session first', async () => {
    repository.findSessionByRefreshTokenHash.mockResolvedValue(sessionFixture);
    repository.rotateSession.mockResolvedValue(null);

    await expect(manager.rotate('raw-refresh-token')).rejects.toThrow(InvalidRefreshTokenException);
    expect(repository.revokeSessionFamily).toHaveBeenCalledWith(sessionFixture.familyId);
  });

  it('revokes only the authenticated user session on logout', async () => {
    await manager.revokeCurrent(userFixture.id, sessionFixture.id);

    expect(repository.revokeSessionForUser).toHaveBeenCalledWith(sessionFixture.id, userFixture.id);
  });
});
