import { AdminUserCapabilityReason } from '@/enums/admin-user-capability-reason.enum';
import type {
  AdminUserActor,
  AdminUserCapability,
  AdminUserCapabilityTarget,
} from '@/types/admin-user-capability.types';

const UNRESTRICTED: AdminUserCapability = {
  canEditProfile: true,
  canChangeRole: true,
  canAssignPlan: true,
  canChangeStatus: true,
  canRotatePassword: true,
  reason: null,
};

/**
 * Resolves what the acting administrator may do to one user row.
 *
 * This exists as a utility rather than as expressions inside the table because
 * the rule has two axes — is this row the super administrator, and is it me —
 * and a component that reads `user.isSuperAdmin` at six separate JSX sites can
 * only see one of them. That is exactly why the super administrator used to see
 * their own row fully disabled.
 *
 * Mirrors the backend, which is authoritative: `PROFILE` is the only scope the
 * super administrator may apply to themselves. Everything else stays locked even
 * for them, because the single-super-admin index makes self-lockout
 * unrecoverable through the product.
 */
export function resolveAdminUserCapability(
  target: AdminUserCapabilityTarget,
  actor: AdminUserActor | null,
): AdminUserCapability {
  if (!target.isSuperAdmin) {
    return UNRESTRICTED;
  }

  const isSelf = actor !== null && actor.id === target.id;
  if (!isSelf) {
    return {
      canEditProfile: false,
      canChangeRole: false,
      canAssignPlan: false,
      canChangeStatus: false,
      canRotatePassword: false,
      reason: AdminUserCapabilityReason.SuperAdminOther,
    };
  }

  return {
    canEditProfile: true,
    canChangeRole: false,
    canAssignPlan: false,
    canChangeStatus: false,
    canRotatePassword: false,
    reason: AdminUserCapabilityReason.SuperAdminSelf,
  };
}
