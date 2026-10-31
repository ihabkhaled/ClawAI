import { type Mock, vi } from 'vitest';
import { BusinessException } from '../../../../common/errors';
import type { AuthenticatedUser } from '../../../../common/types';
import { UserRole } from '../../../../common/enums';
import type { SessionRevocationCacheService } from '../../../auth/services/session-revocation-cache.service';
import type { UsersService } from '../../../users/services/users.service';
import type { SessionAdminRepository } from '../../repositories/session-admin.repository';
import type { SessionGlobalGuardService } from '../session-global-guard.service';
import { SessionGlobalService } from '../session-global.service';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn().mockReturnValue({ JWT_ACCESS_EXPIRY: '15m' }) },
}));

const actor: AuthenticatedUser = {
  id: 'super-1',
  email: 's@x.test',
  role: UserRole.ADMIN,
  sessionId: 'row-1',
};

describe('SessionGlobalService', () => {
  let repository: {
    findFamilyIdBySessionId: Mock;
    terminateBatchGlobally: Mock;
    deleteInactiveFamilies: Mock;
    writeAudit: Mock;
  };
  let guard: { issueChallenge: Mock; assertPhrase: Mock; consume: Mock };
  let users: { assertSuperAdminActor: Mock };
  let cache: { revokeBatch: Mock };
  let service: SessionGlobalService;

  beforeEach(() => {
    repository = {
      findFamilyIdBySessionId: vi.fn().mockResolvedValue('fam-me'),
      terminateBatchGlobally: vi.fn().mockResolvedValue([]),
      deleteInactiveFamilies: vi.fn().mockResolvedValue({ families: 4, rows: 9 }),
      writeAudit: vi.fn().mockResolvedValue(undefined),
    };
    guard = {
      issueChallenge: vi.fn().mockResolvedValue({ token: 't', expiresInSeconds: 60 }),
      assertPhrase: vi.fn(),
      consume: vi.fn().mockResolvedValue(undefined),
    };
    users = { assertSuperAdminActor: vi.fn().mockResolvedValue(undefined) };
    cache = { revokeBatch: vi.fn().mockResolvedValue(0) };
    service = new SessionGlobalService(
      repository as unknown as SessionAdminRepository,
      guard as unknown as SessionGlobalGuardService,
      users as unknown as UsersService,
      cache as unknown as SessionRevocationCacheService,
    );
  });

  describe('challenge', () => {
    it('issues a token only to the super administrator', async () => {
      const result = await service.challenge(
        { action: 'TERMINATE_ALL' as never, password: 'pw' },
        actor,
      );

      expect(result).toEqual({ token: 't', expiresInSeconds: 60 });
      expect(guard.issueChallenge).toHaveBeenCalledWith('super-1', 'TERMINATE_ALL', 'pw');
    });

    it('denies a plain administrator before the password is even checked', async () => {
      users.assertSuperAdminActor.mockRejectedValue(
        new BusinessException('super only', 'SUPER_ADMIN_REQUIRED'),
      );

      await expect(
        service.challenge({ action: 'TERMINATE_ALL' as never, password: 'pw' }, actor),
      ).rejects.toMatchObject({ code: 'SUPER_ADMIN_REQUIRED' });
      expect(guard.issueChallenge).not.toHaveBeenCalled();
    });
  });

  describe('terminateEverything', () => {
    it('keeps the acting admin login by default and publishes every batch until empty', async () => {
      repository.terminateBatchGlobally
        .mockResolvedValueOnce(['a', 'b'])
        .mockResolvedValueOnce(['c'])
        .mockResolvedValueOnce([]);

      const result = await service.terminateEverything(
        { token: 'tok-tok-tok-tok-tok', phrase: 'TERMINATE ALL', keepCurrentSession: true },
        actor,
      );

      expect(result.terminatedRows).toBe(3);
      expect(cache.revokeBatch).toHaveBeenNthCalledWith(1, ['a', 'b']);
      expect(cache.revokeBatch).toHaveBeenNthCalledWith(2, ['c']);
      expect(repository.terminateBatchGlobally).toHaveBeenCalledTimes(3);
      expect(repository.terminateBatchGlobally.mock.calls[0]?.[0]).toMatchObject({
        exceptFamilyId: 'fam-me',
        actorUserId: 'super-1',
      });
      expect(repository.writeAudit).toHaveBeenCalledWith({
        actorUserId: 'super-1',
        action: 'SESSION_GLOBAL_TERMINATE_ALL',
        targetUserId: null,
        familyCount: 0,
        rowCount: 3,
      });
    });

    it('ends the actor own login too only when asked', async () => {
      await service.terminateEverything(
        { token: 'tok-tok-tok-tok-tok', phrase: 'TERMINATE ALL', keepCurrentSession: false },
        actor,
      );

      expect(repository.terminateBatchGlobally.mock.calls[0]?.[0]).toMatchObject({
        exceptFamilyId: null,
      });
      expect(repository.findFamilyIdBySessionId).not.toHaveBeenCalled();
    });

    it('spends the token with the right action and phrase check order', async () => {
      await service.terminateEverything(
        { token: 'tok-tok-tok-tok-tok', phrase: 'TERMINATE ALL', keepCurrentSession: true },
        actor,
      );

      expect(guard.assertPhrase).toHaveBeenCalledWith('TERMINATE ALL', 'TERMINATE ALL');
      expect(guard.consume).toHaveBeenCalledWith('super-1', 'TERMINATE_ALL', 'tok-tok-tok-tok-tok');
      expect(guard.assertPhrase.mock.invocationCallOrder[0]).toBeLessThan(
        guard.consume.mock.invocationCallOrder[0] ?? 0,
      );
    });

    it('does nothing when the phrase is wrong', async () => {
      guard.assertPhrase.mockImplementation(() => {
        throw new BusinessException('phrase', 'GLOBAL_PHRASE_INVALID');
      });

      await expect(
        service.terminateEverything(
          { token: 'tok-tok-tok-tok-tok', phrase: 'nope', keepCurrentSession: true },
          actor,
        ),
      ).rejects.toMatchObject({ code: 'GLOBAL_PHRASE_INVALID' });
      expect(guard.consume).not.toHaveBeenCalled();
      expect(repository.terminateBatchGlobally).not.toHaveBeenCalled();
    });

    it('does nothing when the token is expired, reused or not theirs', async () => {
      guard.consume.mockRejectedValue(new BusinessException('token', 'GLOBAL_TOKEN_INVALID'));

      await expect(
        service.terminateEverything(
          { token: 'tok-tok-tok-tok-tok', phrase: 'TERMINATE ALL', keepCurrentSession: true },
          actor,
        ),
      ).rejects.toMatchObject({ code: 'GLOBAL_TOKEN_INVALID' });
      expect(repository.terminateBatchGlobally).not.toHaveBeenCalled();
    });

    it('is denied for a non-super administrator even with a valid token', async () => {
      users.assertSuperAdminActor.mockRejectedValue(
        new BusinessException('x', 'SUPER_ADMIN_REQUIRED'),
      );

      await expect(
        service.terminateEverything(
          { token: 'tok-tok-tok-tok-tok', phrase: 'TERMINATE ALL', keepCurrentSession: true },
          actor,
        ),
      ).rejects.toMatchObject({ code: 'SUPER_ADMIN_REQUIRED' });
      expect(guard.consume).not.toHaveBeenCalled();
    });

    it('stops at the batch cap instead of looping forever', async () => {
      repository.terminateBatchGlobally.mockResolvedValue(['x']);

      const result = await service.terminateEverything(
        { token: 'tok-tok-tok-tok-tok', phrase: 'TERMINATE ALL', keepCurrentSession: true },
        actor,
      );

      expect(result.terminatedRows).toBe(10_000);
    });
  });

  describe('clearEverything', () => {
    it('needs the clear phrase and its own token, then deletes inactive logs only', async () => {
      const result = await service.clearEverything(
        { token: 'tok-tok-tok-tok-tok', phrase: 'CLEAR ALL LOGS' },
        actor,
      );

      expect(guard.assertPhrase).toHaveBeenCalledWith('CLEAR ALL LOGS', 'CLEAR ALL LOGS');
      expect(guard.consume).toHaveBeenCalledWith(
        'super-1',
        'CLEAR_ALL_LOGS',
        'tok-tok-tok-tok-tok',
      );
      expect(repository.deleteInactiveFamilies).toHaveBeenCalledWith({
        userId: null,
        now: expect.any(Date),
      });
      expect(result).toEqual({ families: 4, rows: 9 });
    });

    it('is denied for a non-super administrator', async () => {
      users.assertSuperAdminActor.mockRejectedValue(
        new BusinessException('x', 'SUPER_ADMIN_REQUIRED'),
      );

      await expect(
        service.clearEverything({ token: 'tok-tok-tok-tok-tok', phrase: 'CLEAR ALL LOGS' }, actor),
      ).rejects.toMatchObject({ code: 'SUPER_ADMIN_REQUIRED' });
      expect(repository.deleteInactiveFamilies).not.toHaveBeenCalled();
    });
  });
});
