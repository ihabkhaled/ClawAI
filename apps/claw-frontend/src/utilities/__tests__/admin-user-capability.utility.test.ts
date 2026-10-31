import { describe, expect, it } from 'vitest';

import { AdminUserCapabilityReason } from '@/enums/admin-user-capability-reason.enum';
import { resolveAdminUserCapability } from '@/utilities/admin-user-capability.utility';

const superAdminRow = { id: 'super-1', isSuperAdmin: true };
const ordinaryRow = { id: 'user-1', isSuperAdmin: false };
const superAdminActor = { id: 'super-1', isSuperAdmin: true };
const otherAdminActor = { id: 'admin-2', isSuperAdmin: false };

describe('resolveAdminUserCapability', () => {
  it('leaves an ordinary row unrestricted, whoever is looking', () => {
    expect(resolveAdminUserCapability(ordinaryRow, otherAdminActor)).toEqual({
      canEditProfile: true,
      canChangeRole: true,
      canAssignPlan: true,
      canChangeStatus: true,
      canRotatePassword: true,
      canBan: true,
      canSetPassword: true,
      reason: null,
    });
  });

  it('never offers ban or set-password on your own row, super admin or not (ADR-200)', () => {
    const ownRow = { id: 'admin-2', isSuperAdmin: false };
    const capability = resolveAdminUserCapability(ownRow, otherAdminActor);

    expect(capability.canBan).toBe(false);
    expect(capability.canSetPassword).toBe(false);
    expect(capability.canEditProfile).toBe(true);
    const superSelf = resolveAdminUserCapability(superAdminRow, superAdminActor);
    expect(superSelf.canBan).toBe(false);
    expect(superSelf.canSetPassword).toBe(false);
  });

  it('locks every control when another administrator views the super admin row', () => {
    const capability = resolveAdminUserCapability(superAdminRow, otherAdminActor);

    expect(capability).toEqual({
      canEditProfile: false,
      canChangeRole: false,
      canAssignPlan: false,
      canChangeStatus: false,
      canRotatePassword: false,
      canBan: false,
      canSetPassword: false,
      reason: AdminUserCapabilityReason.SuperAdminOther,
    });
  });

  it('opens only the profile edit when the super admin views their own row', () => {
    const capability = resolveAdminUserCapability(superAdminRow, superAdminActor);

    expect(capability.canEditProfile).toBe(true);
    expect(capability.reason).toBe(AdminUserCapabilityReason.SuperAdminSelf);
  });

  it('keeps role, status, plan and rotation locked even for the super admin themselves', () => {
    const capability = resolveAdminUserCapability(superAdminRow, superAdminActor);

    expect(capability.canChangeRole).toBe(false);
    expect(capability.canChangeStatus).toBe(false);
    expect(capability.canAssignPlan).toBe(false);
    expect(capability.canRotatePassword).toBe(false);
  });

  it('treats an unknown actor as another administrator rather than as self', () => {
    // A null actor is "we do not know who is asking" — the safe reading is
    // "not you", never "you".
    expect(resolveAdminUserCapability(superAdminRow, null).reason).toBe(
      AdminUserCapabilityReason.SuperAdminOther,
    );
  });

  it('keys the self-exemption on identity, not on the flag alone', () => {
    // Same id, but the row is not flagged: nothing is restricted.
    const impostorRow = { id: 'super-1', isSuperAdmin: false };

    expect(resolveAdminUserCapability(impostorRow, superAdminActor).reason).toBeNull();
  });
});
