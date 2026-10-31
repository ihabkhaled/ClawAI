import { type Mock } from 'vitest';
import { UserRole, UserStatus } from '../../../../common/enums';
import { AccountBannedException, InvalidRefreshTokenException } from '../../../../common/errors';
import { type UsersRepository } from '../../../users/repositories/users.repository';
import { SessionClientKind } from '../../enums/session-client-kind.enum';
import { type AuthRepository } from '../../repositories/auth.repository';
import { AccountBanGateService } from '../../services/account-ban-gate.service';
import { type SessionRevocationCacheService } from '../../services/session-revocation-cache.service';
import { type UserPresenceService } from '../../services/user-presence.service';
import { TokenSessionManager } from '../token-session.manager';

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

const active = { id: 'user-1', email: 'u@x.co', role: UserRole.USER, status: UserStatus.ACTIVE };
const session = {
  id: 'session-1',
  userId: 'user-1',
  familyId: 'family-1',
  clientKind: SessionClientKind.VSCODE,
  clientName: null,
  persistent: true,
  usedAt: null,
  revokedAt: null,
  expiresAt: new Date('2099-01-01T00:00:00.000Z'),
};

describe('TokenSessionManager with the ban gate (real AccountBanGateService)', () => {
  let repository: {
    createSession: Mock;
    findSessionByRefreshTokenHash: Mock;
    findUserById: Mock;
    rotateSession: Mock;
    revokeSessionFamily: Mock;
  };
  let clearBan: Mock;
  let revocationCache: { revoke: Mock };
  let presence: { touch: Mock };
  let manager: TokenSessionManager;

  beforeEach(() => {
    repository = {
      createSession: vi.fn().mockResolvedValue({ id: 'session-9' }),
      findSessionByRefreshTokenHash: vi.fn().mockResolvedValue(session),
      findUserById: vi.fn().mockResolvedValue(active),
      rotateSession: vi.fn().mockResolvedValue({ id: 'session-2' }),
      revokeSessionFamily: vi.fn().mockResolvedValue(['session-1']),
    };
    clearBan = vi.fn().mockResolvedValue(undefined);
    revocationCache = { revoke: vi.fn().mockResolvedValue(undefined) };
    presence = { touch: vi.fn().mockResolvedValue(true) };
    manager = new TokenSessionManager(
      repository as unknown as AuthRepository,
      revocationCache as unknown as SessionRevocationCacheService,
      new AccountBanGateService({ clearBan } as unknown as UsersRepository),
      presence as unknown as UserPresenceService,
    );
  });

  const lifetime = { ...active, bannedAt: new Date(), bannedUntil: null };
  const timed = { ...active, bannedAt: new Date(), bannedUntil: new Date(Date.now() + 60_000) };
  const expired = {
    ...active,
    bannedAt: new Date(Date.now() - 120_000),
    bannedUntil: new Date(Date.now() - 1000),
  };

  describe('issue (every sign-in path)', () => {
    it.each([
      ['lifetime', lifetime],
      ['timed', timed],
    ])('refuses a %s ban and creates no session', async (_n, user) => {
      await expect(manager.issue(user, { kind: SessionClientKind.WEB })).rejects.toBeInstanceOf(
        AccountBannedException,
      );
      expect(repository.createSession).not.toHaveBeenCalled();
      expect(presence.touch).not.toHaveBeenCalled();
    });

    it('lets an unbanned account in and touches presence', async () => {
      await expect(manager.issue(active, { kind: SessionClientKind.WEB })).resolves.toMatchObject({
        accessToken: 'access-token',
      });
      expect(presence.touch).toHaveBeenCalledWith('user-1');
    });

    it('lets a user whose timed ban expired sign in again, and clears the ban', async () => {
      await expect(manager.issue(expired, { kind: SessionClientKind.WEB })).resolves.toMatchObject({
        accessToken: 'access-token',
      });
      expect(clearBan).toHaveBeenCalledWith('user-1');
    });
  });

  describe('rotate (refresh)', () => {
    it.each([
      ['lifetime', lifetime],
      ['timed', timed],
    ])('refuses a %s ban with the coded error and closes the family', async (_n, user) => {
      repository.findUserById.mockResolvedValue(user);
      await expect(manager.rotate('raw')).rejects.toBeInstanceOf(AccountBannedException);
      expect(repository.revokeSessionFamily).toHaveBeenCalledWith('family-1', 'ACCOUNT_BANNED');
      expect(revocationCache.revoke).toHaveBeenCalledWith(['session-1']);
      expect(repository.rotateSession).not.toHaveBeenCalled();
    });

    it('refreshes normally after the ban expired', async () => {
      repository.findUserById.mockResolvedValue(expired);
      await expect(manager.rotate('raw')).resolves.toMatchObject({ accessToken: 'access-token' });
      expect(repository.revokeSessionFamily).not.toHaveBeenCalled();
    });

    it('touches presence on a successful refresh', async () => {
      await manager.rotate('raw');
      expect(presence.touch).toHaveBeenCalledWith('user-1');
    });

    describe('a refresh token whose family the ban already closed', () => {
      beforeEach(() => {
        repository.findSessionByRefreshTokenHash.mockResolvedValue({
          ...session,
          revokedAt: new Date(),
        });
      });

      it('answers ACCOUNT_BANNED while the ban is live (the coded error, not the generic one)', async () => {
        repository.findUserById.mockResolvedValue(lifetime);
        await expect(manager.rotate('raw')).rejects.toBeInstanceOf(AccountBannedException);
      });

      it('stays INVALID_REFRESH_TOKEN for an unbanned account', async () => {
        await expect(manager.rotate('raw')).rejects.toBeInstanceOf(InvalidRefreshTokenException);
      });

      it('stays INVALID_REFRESH_TOKEN once a timed ban has expired', async () => {
        repository.findUserById.mockResolvedValue(expired);
        await expect(manager.rotate('raw')).rejects.toBeInstanceOf(InvalidRefreshTokenException);
      });
    });
  });
});
