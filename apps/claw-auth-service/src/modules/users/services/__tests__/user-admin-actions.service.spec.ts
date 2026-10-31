import { type Mock } from 'vitest';
import { EventPattern } from '@claw/shared-types';
import { BanDurationUnit, UserRole, UserStatus } from '../../../../common/enums';
import type { SessionRevocationCacheService } from '../../../auth/services/session-revocation-cache.service';
import { type UsersRepository } from '../../repositories/users.repository';
import { validatePasswordStrength } from '../../service.utilities/password-policy.utility';
import { UserAdminActionsService } from '../user-admin-actions.service';
import { UsersService } from '../users.service';

vi.mock('@common/utilities', () => ({
  hashPassword: vi.fn((plain: string) => Promise.resolve(`hash:${plain}`)),
  verifyPassword: vi.fn((hash: string, plain: string) => Promise.resolve(hash === `hash:${plain}`)),
}));

const ADMIN = 'admin-1';
const SUPER = 'super-1';
const base = {
  id: 'user-1',
  email: 'u@x.co',
  username: 'u',
  passwordHash: 'hash:Old-Pass1',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  isSuperAdmin: false,
  emailVerifiedAt: null,
  firstName: null,
  lastName: null,
  phone: null,
  mustChangePassword: false,
  languagePreference: 'EN',
  appearancePreference: 'SYSTEM',
  currencyPreferenceMode: 'AUTO',
  preferredCountryCode: null,
  preferredCurrencyCode: null,
  ttsVoice: null,
  roleId: null,
  activePlanId: null,
  registrationIp: null,
  registrationCountryCode: null,
  lastSeenAt: null,
  bannedAt: null as Date | null,
  bannedUntil: null as Date | null,
  banReason: null as string | null,
  bannedByUserId: null as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UserAdminActionsService', () => {
  let rows: Record<string, typeof base>;
  let repo: {
    findById: Mock;
    updateById: Mock;
    clearBan: Mock;
    revokeSessionsReturningIds: Mock;
  };
  let revoke: Mock;
  let publish: Mock;
  let service: UserAdminActionsService;

  beforeEach(() => {
    rows = {
      [base.id]: { ...base },
      [ADMIN]: { ...base, id: ADMIN, role: UserRole.ADMIN },
      [SUPER]: { ...base, id: SUPER, role: UserRole.ADMIN, isSuperAdmin: true },
      'admin-2': { ...base, id: 'admin-2', role: UserRole.ADMIN },
    };
    repo = {
      findById: vi.fn((id: string) => Promise.resolve(rows[id] ?? null)),
      updateById: vi.fn((id: string, data: object) => Promise.resolve({ ...rows[id], ...data })),
      clearBan: vi.fn((id: string) =>
        Promise.resolve({
          ...rows[id],
          bannedAt: null,
          bannedUntil: null,
          banReason: null,
          bannedByUserId: null,
        }),
      ),
      revokeSessionsReturningIds: vi.fn().mockResolvedValue(['s1', 's2']),
    };
    revoke = vi.fn().mockResolvedValue(undefined);
    publish = vi.fn().mockResolvedValue(undefined);
    const rabbit = { publish };
    const usersService = new UsersService(
      repo as unknown as UsersRepository,
      rabbit as never,
      {} as never,
      {} as never,
      {} as never,
      { deleteAccount: vi.fn() },
    );
    service = new UserAdminActionsService(
      repo as unknown as UsersRepository,
      usersService,
      { revoke } as unknown as SessionRevocationCacheService,
      rabbit as never,
    );
  });

  describe('ban', () => {
    it('bans for a duration, revokes every session AND publishes the ids to the guards (ADR-112)', async () => {
      const result = await service.ban(
        'user-1',
        { unit: BanDurationUnit.HOURS, amount: 2, reason: 'spam' },
        ADMIN,
      );
      const data = repo.updateById.mock.calls[0]?.[1] as Record<string, any>;
      expect(data.bannedUntil.getTime() - data.bannedAt.getTime()).toBe(7_200_000);
      expect(data).toMatchObject({ banReason: 'spam', bannedByUserId: ADMIN });
      expect(repo.revokeSessionsReturningIds).toHaveBeenCalledWith('user-1', 'ACCOUNT_BANNED');
      expect(revoke).toHaveBeenCalledWith(['s1', 's2']);
      expect(publish).toHaveBeenCalledWith(
        EventPattern.USER_UPDATED,
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(result).toMatchObject({ isBanned: true, banPermanent: false });
    });

    it('bans for lifetime with a null end', async () => {
      const result = await service.ban(
        'user-1',
        { unit: BanDurationUnit.LIFETIME, reason: 'abuse' },
        ADMIN,
      );
      expect((repo.updateById.mock.calls[0]?.[1] as Record<string, any>).bannedUntil).toBeNull();
      expect(result).toMatchObject({ isBanned: true, banPermanent: true });
    });

    it('refuses to ban yourself, before touching anything', async () => {
      await expect(
        service.ban(ADMIN, { unit: BanDurationUnit.LIFETIME, reason: 'r' }, ADMIN),
      ).rejects.toMatchObject({ code: 'CANNOT_BAN_SELF', status: 403 });
      expect(repo.updateById).not.toHaveBeenCalled();
      expect(revoke).not.toHaveBeenCalled();
    });

    it('refuses to ban the super administrator, even for the super administrator', async () => {
      await expect(
        service.ban(SUPER, { unit: BanDurationUnit.LIFETIME, reason: 'r' }, ADMIN),
      ).rejects.toMatchObject({ code: 'SUPER_ADMIN_IMMUTABLE', status: 403 });
      await expect(
        service.ban(SUPER, { unit: BanDurationUnit.LIFETIME, reason: 'r' }, SUPER),
      ).rejects.toMatchObject({ code: 'CANNOT_BAN_SELF' });
      expect(repo.updateById).not.toHaveBeenCalled();
    });

    it('only the super administrator may ban another administrator', async () => {
      await expect(
        service.ban('admin-2', { unit: BanDurationUnit.LIFETIME, reason: 'r' }, ADMIN),
      ).rejects.toMatchObject({ code: 'SUPER_ADMIN_REQUIRED', status: 403 });
      await expect(
        service.ban('admin-2', { unit: BanDurationUnit.LIFETIME, reason: 'r' }, SUPER),
      ).resolves.toMatchObject({ isBanned: true });
    });

    it('404s for an unknown user', async () => {
      await expect(
        service.ban('nope', { unit: BanDurationUnit.LIFETIME, reason: 'r' }, ADMIN),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('unban', () => {
    it('clears the ban columns of a banned user', async () => {
      rows['user-1'] = { ...base, bannedAt: new Date(), bannedUntil: null, banReason: 'x' };
      const result = await service.unban('user-1', ADMIN);
      expect(repo.clearBan).toHaveBeenCalledWith('user-1');
      expect(result.isBanned).toBe(false);
    });

    it('answers 409 USER_NOT_BANNED for an account that is not banned', async () => {
      await expect(service.unban('user-1', ADMIN)).rejects.toMatchObject({
        code: 'USER_NOT_BANNED',
        status: 409,
      });
    });

    it('cannot touch the super administrator', async () => {
      await expect(service.unban(SUPER, ADMIN)).rejects.toMatchObject({
        code: 'SUPER_ADMIN_IMMUTABLE',
      });
    });
  });

  describe('setPassword', () => {
    it('sets a manual password that passes the policy: hashed, must-change, sessions revoked and published', async () => {
      const result = await service.setPassword(
        'user-1',
        { mode: 'MANUAL', password: 'New-Pass123' },
        ADMIN,
      );
      expect(result).toEqual({});
      expect(repo.updateById).toHaveBeenCalledWith('user-1', {
        passwordHash: 'hash:New-Pass123',
        mustChangePassword: true,
      });
      expect(revoke).toHaveBeenCalledWith(['s1', 's2']);
      expect(publish).toHaveBeenCalledWith(
        EventPattern.USER_TEMPORARY_PASSWORD_ISSUED,
        expect.objectContaining({ userId: 'user-1', issuedBy: ADMIN }),
      );
    });

    it.each(['short1A', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere'])(
      'rejects the weak password %s with WEAK_PASSWORD and changes nothing',
      async (password) => {
        await expect(
          service.setPassword('user-1', { mode: 'MANUAL', password }, ADMIN),
        ).rejects.toMatchObject({ code: 'WEAK_PASSWORD', status: 400 });
        expect(repo.updateById).not.toHaveBeenCalled();
        expect(revoke).not.toHaveBeenCalled();
      },
    );

    it('generates a policy-compliant password, stores only its hash, and returns it once', async () => {
      const result = await service.setPassword('user-1', { mode: 'GENERATE' }, ADMIN);
      const generated = result.generatedPassword ?? '';
      expect(validatePasswordStrength(generated).valid).toBe(true);
      const stored = repo.updateById.mock.calls[0]?.[1] as Record<string, any>;
      expect(stored.passwordHash).toBe(`hash:${generated}`);
      expect(JSON.stringify(stored)).not.toBe(generated);
      expect(stored.mustChangePassword).toBe(true);
      expect(JSON.stringify(publish.mock.calls)).not.toContain(generated);
    });

    it('refuses to set your own password this way', async () => {
      await expect(service.setPassword(ADMIN, { mode: 'GENERATE' }, ADMIN)).rejects.toMatchObject({
        code: 'CANNOT_SET_OWN_PASSWORD',
        status: 403,
      });
    });

    it('cannot set the super administrator password, and a plain admin cannot set another admin password', async () => {
      await expect(service.setPassword(SUPER, { mode: 'GENERATE' }, ADMIN)).rejects.toMatchObject({
        code: 'SUPER_ADMIN_IMMUTABLE',
      });
      await expect(
        service.setPassword('admin-2', { mode: 'GENERATE' }, ADMIN),
      ).rejects.toMatchObject({
        code: 'SUPER_ADMIN_REQUIRED',
      });
      expect(repo.updateById).not.toHaveBeenCalled();
    });
  });
});
