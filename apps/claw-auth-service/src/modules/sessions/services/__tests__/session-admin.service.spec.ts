import { type Mock, vi } from 'vitest';
import { BusinessException } from '../../../../common/errors';
import type { AuthenticatedUser } from '../../../../common/types';
import { UserRole } from '../../../../common/enums';
import type { SessionRevocationCacheService } from '../../../auth/services/session-revocation-cache.service';
import type { UsersService } from '../../../users/services/users.service';
import type { SessionAdminRepository } from '../../repositories/session-admin.repository';
import { SessionAdminService } from '../session-admin.service';

const admin: AuthenticatedUser = {
  id: 'admin-1',
  email: 'a@x.test',
  role: UserRole.ADMIN,
  sessionId: 'row-9',
};

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    family_id: 'fam-1',
    state: 'ACTIVE',
    ip_address: '41.33.1.1',
    country_code: 'EG',
    user_agent: 'UA',
    os: 'Windows',
    browser: 'Chrome 130',
    device_kind: 'DESKTOP',
    client_kind: 'WEB',
    client_name: 'ClawAI Web',
    persistent: true,
    login_at: new Date('2026-10-30T00:00:00Z'),
    last_used_at: new Date('2026-10-31T00:00:00Z'),
    expires_at: new Date('2026-11-07T00:00:00Z'),
    rotations: 3,
    terminated_at: null,
    termination_reason: null,
    terminated_by_user_id: null,
    terminated_by_name: null,
    total: 1,
    ...overrides,
  };
}

describe('SessionAdminService', () => {
  let repository: Record<keyof SessionAdminRepository, Mock>;
  let users: { getSessionTarget: Mock; assertSessionsManageable: Mock };
  let cache: { revoke: Mock };
  let service: SessionAdminService;

  beforeEach(() => {
    repository = {
      listFamilies: vi.fn().mockResolvedValue([row()]),
      summarize: vi.fn().mockResolvedValue({ active: 1, expired: 0, terminated: 0, total: 1 }),
      findFamilyIdBySessionId: vi.fn().mockResolvedValue('fam-current'),
      familyExistsForUser: vi.fn().mockResolvedValue(true),
      isFamilyActive: vi.fn().mockResolvedValue(false),
      terminateOpenRows: vi.fn().mockResolvedValue(['r1', 'r2']),
      countFamilies: vi.fn().mockResolvedValue(1),
      terminateBatchGlobally: vi.fn(),
      deleteInactiveFamilies: vi.fn().mockResolvedValue({ families: 2, rows: 5 }),
      findPasswordHash: vi.fn(),
      writeAudit: vi.fn().mockResolvedValue(undefined),
    } as unknown as Record<keyof SessionAdminRepository, Mock>;
    users = {
      getSessionTarget: vi.fn().mockResolvedValue({ id: 'u1', role: 'USER', username: 'u' }),
      assertSessionsManageable: vi.fn().mockResolvedValue(undefined),
    };
    cache = { revoke: vi.fn().mockResolvedValue(undefined) };
    service = new SessionAdminService(
      repository as unknown as SessionAdminRepository,
      users as unknown as UsersService,
      cache as unknown as SessionRevocationCacheService,
    );
  });

  describe('list', () => {
    it('returns one view per login with origin, paging meta and the summary', async () => {
      const result = await service.list('u1', { page: 1, pageSize: 20 }, admin);

      expect(result.user).toEqual({ id: 'u1', username: 'u' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        familyId: 'fam-1',
        ipAddress: '41.33.1.1',
        countryCode: 'EG',
        os: 'Windows',
        browser: 'Chrome 130',
        state: 'ACTIVE',
        isCurrent: false,
      });
      expect(result.meta).toEqual({ total: 1, page: 1, pageSize: 20, totalPages: 1 });
      expect(result.summary.active).toBe(1);
    });

    it('passes the state filter and page to the query, newest handled by SQL', async () => {
      await service.list('u1', { state: 'TERMINATED' as never, page: 3, pageSize: 10 }, admin);

      expect(repository.listFamilies).toHaveBeenCalledWith(
        'u1',
        'TERMINATED',
        3,
        10,
        expect.any(Date),
      );
    });

    it('shows expired and terminated logins with who, when and why', async () => {
      repository.listFamilies.mockResolvedValue([
        row({ family_id: 'a', state: 'EXPIRED' }),
        row({
          family_id: 'b',
          state: 'TERMINATED',
          terminated_at: new Date('2026-10-31T10:00:00Z'),
          termination_reason: 'ADMIN_TERMINATED',
          terminated_by_user_id: 'admin-1',
          terminated_by_name: 'boss',
          total: 2,
        }),
      ]);

      const { data } = await service.list('u1', { page: 1, pageSize: 20 }, admin);

      expect(data[0]?.state).toBe('EXPIRED');
      expect(data[1]).toMatchObject({
        state: 'TERMINATED',
        terminationReason: 'ADMIN_TERMINATED',
        terminatedByName: 'boss',
      });
    });

    it('marks the admin own current login only when viewing their own account', async () => {
      repository.listFamilies.mockResolvedValue([row({ family_id: 'fam-current' })]);

      const own = await service.list('admin-1', { page: 1, pageSize: 20 }, admin);
      expect(own.data[0]?.isCurrent).toBe(true);

      const other = await service.list('u1', { page: 1, pageSize: 20 }, admin);
      expect(other.data[0]?.isCurrent).toBe(false);
      expect(repository.findFamilyIdBySessionId).toHaveBeenCalledTimes(1);
    });

    it('computes pages from the total', async () => {
      repository.listFamilies.mockResolvedValue([row({ total: 45 })]);

      const result = await service.list('u1', { page: 1, pageSize: 20 }, admin);

      expect(result.meta.totalPages).toBe(3);
    });

    it('refuses an unknown user before touching sessions', async () => {
      users.getSessionTarget.mockRejectedValue(new Error('nope'));

      await expect(service.list('ghost', { page: 1, pageSize: 20 }, admin)).rejects.toThrow('nope');
      expect(repository.listFamilies).not.toHaveBeenCalled();
    });
  });

  describe('terminateOne', () => {
    it('closes the login, publishes the closed ids and audits counts only', async () => {
      const result = await service.terminateOne('u1', 'fam-1', {}, admin);

      expect(repository.terminateOpenRows).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          familyId: 'fam-1',
          reason: 'ADMIN_TERMINATED',
          actorUserId: 'admin-1',
        }),
      );
      expect(cache.revoke).toHaveBeenCalledWith(['r1', 'r2']);
      expect(result).toEqual({ terminatedFamilies: 1, terminatedRows: 2 });
      expect(repository.writeAudit).toHaveBeenCalledWith({
        actorUserId: 'admin-1',
        action: 'SESSION_TERMINATE_ONE',
        targetUserId: 'u1',
        familyCount: 1,
        rowCount: 2,
      });
    });

    it('is idempotent: an already ended login reports zero and publishes nothing new', async () => {
      repository.terminateOpenRows.mockResolvedValue([]);

      const result = await service.terminateOne('u1', 'fam-1', {}, admin);

      expect(result).toEqual({ terminatedFamilies: 0, terminatedRows: 0 });
    });

    it('answers SESSION_NOT_FOUND for a login that is not this user', async () => {
      repository.familyExistsForUser.mockResolvedValue(false);

      await expect(service.terminateOne('u1', 'other', {}, admin)).rejects.toMatchObject({
        code: 'SESSION_NOT_FOUND',
      });
      expect(repository.terminateOpenRows).not.toHaveBeenCalled();
    });

    it('is denied when the actor may not manage the target (super admin shield)', async () => {
      users.assertSessionsManageable.mockRejectedValue(
        new BusinessException('shielded', 'SUPER_ADMIN_IMMUTABLE'),
      );

      await expect(service.terminateOne('u1', 'fam-1', {}, admin)).rejects.toMatchObject({
        code: 'SUPER_ADMIN_IMMUTABLE',
      });
      expect(repository.terminateOpenRows).not.toHaveBeenCalled();
      expect(cache.revoke).not.toHaveBeenCalled();
    });

    it('refuses to end your own CURRENT login without an explicit confirm', async () => {
      await expect(service.terminateOne('admin-1', 'fam-current', {}, admin)).rejects.toMatchObject(
        {
          code: 'CURRENT_SESSION_CONFIRM_REQUIRED',
        },
      );
      expect(repository.terminateOpenRows).not.toHaveBeenCalled();
    });

    it('ends your own current login when confirmed', async () => {
      await service.terminateOne('admin-1', 'fam-current', { confirmCurrent: true }, admin);

      expect(repository.terminateOpenRows).toHaveBeenCalled();
    });

    it('needs no confirm for another of your own logins', async () => {
      await service.terminateOne('admin-1', 'fam-other', {}, admin);

      expect(repository.terminateOpenRows).toHaveBeenCalled();
    });
  });

  describe('terminateAll', () => {
    it('ends every login of the user and publishes every id', async () => {
      const result = await service.terminateAll('u1', {}, admin);

      expect(repository.terminateOpenRows).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', reason: 'ADMIN_TERMINATED_ALL' }),
      );
      expect(repository.terminateOpenRows.mock.calls[0]?.[0]).not.toHaveProperty('familyId');
      expect(cache.revoke).toHaveBeenCalledWith(['r1', 'r2']);
      expect(result).toEqual({ terminatedFamilies: 1, terminatedRows: 2 });
    });

    it('requires the confirm when the target is yourself (it includes this login)', async () => {
      await expect(service.terminateAll('admin-1', {}, admin)).rejects.toMatchObject({
        code: 'CURRENT_SESSION_CONFIRM_REQUIRED',
      });
      await service.terminateAll('admin-1', { confirmCurrent: true }, admin);
      expect(repository.terminateOpenRows).toHaveBeenCalledTimes(1);
    });

    it('is denied for a shielded target', async () => {
      users.assertSessionsManageable.mockRejectedValue(
        new BusinessException('need super', 'SUPER_ADMIN_REQUIRED'),
      );

      await expect(service.terminateAll('u1', {}, admin)).rejects.toMatchObject({
        code: 'SUPER_ADMIN_REQUIRED',
      });
      expect(repository.terminateOpenRows).not.toHaveBeenCalled();
    });
  });

  describe('clear logs', () => {
    it('clears one finished login', async () => {
      const result = await service.clearOne('u1', 'fam-1', admin);

      expect(repository.deleteInactiveFamilies).toHaveBeenCalledWith({
        userId: 'u1',
        familyId: 'fam-1',
        now: expect.any(Date),
      });
      expect(result).toEqual({ families: 2, rows: 5 });
    });

    it('NEVER clears an ACTIVE login: it must be terminated first', async () => {
      repository.isFamilyActive.mockResolvedValue(true);

      await expect(service.clearOne('u1', 'fam-1', admin)).rejects.toMatchObject({
        code: 'SESSION_ACTIVE_CANNOT_CLEAR',
      });
      expect(repository.deleteInactiveFamilies).not.toHaveBeenCalled();
    });

    it('answers SESSION_NOT_FOUND when clearing a login that does not exist', async () => {
      repository.familyExistsForUser.mockResolvedValue(false);

      await expect(service.clearOne('u1', 'nope', admin)).rejects.toMatchObject({
        code: 'SESSION_NOT_FOUND',
      });
    });

    it('clears all inactive logs of the user (the delete itself skips active ones)', async () => {
      const result = await service.clearInactive('u1', admin);

      expect(repository.deleteInactiveFamilies).toHaveBeenCalledWith({
        userId: 'u1',
        now: expect.any(Date),
      });
      expect(result).toEqual({ families: 2, rows: 5 });
      expect(repository.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SESSION_CLEAR_USER_LOGS', familyCount: 2, rowCount: 5 }),
      );
    });

    it('is denied for a shielded target', async () => {
      users.assertSessionsManageable.mockRejectedValue(new BusinessException('x', 'DENIED'));

      await expect(service.clearInactive('u1', admin)).rejects.toMatchObject({ code: 'DENIED' });
      expect(repository.deleteInactiveFamilies).not.toHaveBeenCalled();
    });
  });

  it('still answers when the audit write fails (the action already happened)', async () => {
    repository.writeAudit.mockRejectedValue(new Error('db down'));

    await expect(service.terminateAll('u1', {}, admin)).resolves.toMatchObject({
      terminatedRows: 2,
    });
  });
});
