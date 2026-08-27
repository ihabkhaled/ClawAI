import { resolveSuperAdminMutability } from '../super-admin-mutability.utility';
import { SuperAdminMutationScope } from '../../../../common/enums/super-admin-mutation-scope.enum';

const superAdmin = { id: 'super-1', isSuperAdmin: true };
const ordinary = { id: 'user-1', isSuperAdmin: false };

const EVERY_SCOPE = Object.values(SuperAdminMutationScope);

describe('resolveSuperAdminMutability', () => {
  describe('when the target is not the super administrator', () => {
    it.each(EVERY_SCOPE)('allows %s regardless of who the actor is', (scope) => {
      expect(
        resolveSuperAdminMutability({ target: ordinary, actorId: 'someone-else', scope }),
      ).toEqual({
        allowed: true,
      });
    });
  });

  describe('when the actor is a different administrator', () => {
    it.each(EVERY_SCOPE)('refuses %s as immutable to others', (scope) => {
      expect(
        resolveSuperAdminMutability({ target: superAdmin, actorId: 'admin-2', scope }),
      ).toEqual({
        allowed: false,
        reason: 'IMMUTABLE_TO_OTHERS',
      });
    });
  });

  describe('when the actor is the super administrator themselves', () => {
    it('allows a profile edit', () => {
      expect(
        resolveSuperAdminMutability({
          target: superAdmin,
          actorId: superAdmin.id,
          scope: SuperAdminMutationScope.PROFILE,
        }),
      ).toEqual({ allowed: true });
    });

    it.each([
      SuperAdminMutationScope.ROLE,
      SuperAdminMutationScope.STATUS,
      SuperAdminMutationScope.DELETE,
      SuperAdminMutationScope.PLAN,
      SuperAdminMutationScope.TEMPORARY_PASSWORD,
    ])('refuses %s as locked for self', (scope) => {
      expect(
        resolveSuperAdminMutability({ target: superAdmin, actorId: superAdmin.id, scope }),
      ).toEqual({ allowed: false, reason: 'LOCKED_FOR_SELF' });
    });

    it('never lets self-deletion through, because the single-super-admin index makes it unrecoverable', () => {
      expect(
        resolveSuperAdminMutability({
          target: superAdmin,
          actorId: superAdmin.id,
          scope: SuperAdminMutationScope.DELETE,
        }),
      ).toEqual({ allowed: false, reason: 'LOCKED_FOR_SELF' });
    });
  });

  it('keys the self-exemption on identity, not on the super-admin flag alone', () => {
    const impostor = { id: 'super-1', isSuperAdmin: false };
    expect(
      resolveSuperAdminMutability({
        target: impostor,
        actorId: 'super-1',
        scope: SuperAdminMutationScope.DELETE,
      }),
    ).toEqual({ allowed: true });
  });
});
