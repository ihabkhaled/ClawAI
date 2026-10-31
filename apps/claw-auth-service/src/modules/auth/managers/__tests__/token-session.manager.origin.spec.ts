import { type Mock, vi } from 'vitest';
import {
  InvalidRefreshTokenException,
  SessionTerminatedException,
} from '../../../../common/errors';
import { UserRole, UserStatus } from '../../../../common/enums';
import { SessionClientKind } from '../../enums/session-client-kind.enum';
import { type AuthRepository } from '../../repositories/auth.repository';
import { TokenSessionManager } from '../token-session.manager';
import { type SessionRevocationCacheService } from '../../services/session-revocation-cache.service';
import { type AccountBanGateService } from '../../services/account-ban-gate.service';
import { type UserPresenceService } from '../../services/user-presence.service';

vi.mock('@common/utilities', () => ({
  signAccessToken: vi.fn().mockReturnValue('access-token'),
  signRefreshToken: vi.fn().mockReturnValue('raw-refresh-token'),
}));

vi.mock('@claw/shared-utilities', () => ({
  hashBearerToken: vi.fn().mockReturnValue('refresh-digest'),
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn().mockReturnValue({
      JWT_SECRET: 'test-secret-key-that-is-long-enough',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
    }),
  },
}));

const user = {
  id: 'user-1',
  email: 'user@example.com',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
};

/** The LOGIN's origin: a Cairo desktop Chrome. */
const LOGIN_ORIGIN = {
  ipAddress: '41.33.1.1',
  countryCode: 'EG',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0.0.0',
  os: 'Windows',
  browser: 'Chrome 130',
  deviceKind: 'DESKTOP',
};

const session = {
  id: 'session-1',
  userId: user.id,
  refreshTokenHash: 'refresh-digest',
  familyId: 'family-1',
  clientKind: SessionClientKind.WEB,
  clientName: 'ClawAI Web',
  persistent: true,
  usedAt: null,
  revokedAt: null,
  replacedBySessionId: null,
  terminatedAt: null,
  terminatedByUserId: null,
  terminationReason: null,
  expiresAt: new Date('2099-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-07-27T00:00:00.000Z'),
  updatedAt: new Date('2026-07-27T00:00:00.000Z'),
  ...LOGIN_ORIGIN,
};

describe('TokenSessionManager session origin and termination (ADR-204)', () => {
  let repository: {
    createSession: Mock;
    findSessionByRefreshTokenHash: Mock;
    findSessionById: Mock;
    findUserById: Mock;
    rotateSession: Mock;
    revokeSessionFamily: Mock;
    revokeSessionForUser: Mock;
  };
  let manager: TokenSessionManager;

  beforeEach(() => {
    repository = {
      createSession: vi.fn().mockResolvedValue(session),
      findSessionByRefreshTokenHash: vi.fn(),
      findSessionById: vi.fn(),
      findUserById: vi.fn().mockResolvedValue(user),
      rotateSession: vi.fn().mockResolvedValue({ ...session, id: 'session-2' }),
      revokeSessionFamily: vi.fn().mockResolvedValue(['session-1']),
      revokeSessionForUser: vi.fn().mockResolvedValue(true),
    };
    manager = new TokenSessionManager(
      repository as unknown as AuthRepository,
      { revoke: vi.fn().mockResolvedValue(undefined) } as unknown as SessionRevocationCacheService,
      { assertNotBanned: vi.fn().mockResolvedValue(undefined) } as unknown as AccountBanGateService,
      { touch: vi.fn().mockResolvedValue(true) } as unknown as UserPresenceService,
    );
  });

  it('records the login origin on the first row of a new family', async () => {
    await manager.issue(user, { kind: SessionClientKind.WEB, origin: LOGIN_ORIGIN });

    expect(repository.createSession).toHaveBeenCalledWith(expect.objectContaining(LOGIN_ORIGIN));
  });

  it('records an all-null origin when the sign-in path had no request to read', async () => {
    await manager.issue(user, { kind: SessionClientKind.VSCODE });

    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: null, userAgent: null, deviceKind: null }),
    );
  });

  it('carries the LOGIN origin onto the rotated row, never the refresh request values', async () => {
    repository.findSessionByRefreshTokenHash.mockResolvedValue(session);

    await manager.rotate('raw-refresh-token');

    const replacement = repository.rotateSession.mock.calls[0]?.[0].replacement;
    expect(replacement).toMatchObject({ ...LOGIN_ORIGIN, familyId: 'family-1' });
  });

  it('carries the login origin onto a sibling issued inside the reuse grace window', async () => {
    repository.findSessionByRefreshTokenHash.mockResolvedValue({
      ...session,
      usedAt: new Date(Date.now() - 2_000),
    });

    await manager.rotate('raw-refresh-token');

    expect(repository.createSession).toHaveBeenCalledWith(expect.objectContaining(LOGIN_ORIGIN));
  });

  it('refuses the refresh of a login an administrator ended with the coded SESSION_TERMINATED', async () => {
    repository.findSessionByRefreshTokenHash.mockResolvedValue({
      ...session,
      revokedAt: new Date(),
      terminatedAt: new Date(),
      terminatedByUserId: 'admin-1',
      terminationReason: 'ADMIN_TERMINATED',
    });

    await expect(manager.rotate('raw-refresh-token')).rejects.toBeInstanceOf(
      SessionTerminatedException,
    );
    expect(repository.createSession).not.toHaveBeenCalled();
    expect(repository.rotateSession).not.toHaveBeenCalled();
    // The family sweep keeps the original reason instead of relabelling it as theft.
    expect(repository.revokeSessionFamily).toHaveBeenCalledWith('family-1', 'ADMIN_TERMINATED');
  });

  it('keeps the generic error for a legacy revoked row with no recorded reason', async () => {
    repository.findSessionByRefreshTokenHash.mockResolvedValue({
      ...session,
      revokedAt: new Date(),
    });

    await expect(manager.rotate('raw-refresh-token')).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it('labels a replay of an expired token as TOKEN_REUSE and answers generically', async () => {
    repository.findSessionByRefreshTokenHash.mockResolvedValue({
      ...session,
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    await expect(manager.rotate('raw-refresh-token')).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
    expect(repository.revokeSessionFamily).toHaveBeenCalledWith('family-1', 'TOKEN_REUSE');
  });
});
