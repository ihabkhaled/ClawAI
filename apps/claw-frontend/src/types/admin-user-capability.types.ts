import type { AdminUserCapabilityReason } from '@/enums/admin-user-capability-reason.enum';

/** The acting administrator, as far as the capability rule is concerned. */
export interface AdminUserActor {
  id: string;
  isSuperAdmin: boolean;
}

/** The row being rendered, as far as the capability rule is concerned. */
export interface AdminUserCapabilityTarget {
  id: string;
  isSuperAdmin: boolean;
}

/**
 * What the acting administrator may do to one row.
 *
 * Mirrors the backend `SuperAdminMutationScope` decisions in
 * `apps/claw-auth-service/src/common/constants/super-admin.constants.ts`. The two
 * change together: a control the UI offers and the API refuses is worse than no
 * control at all.
 */
export interface AdminUserCapability {
  canEditProfile: boolean;
  canChangeRole: boolean;
  canAssignPlan: boolean;
  canChangeStatus: boolean;
  canRotatePassword: boolean;
  /**
   * `null` when nothing is restricted on this row. Carried rather than inferred
   * so the row can explain itself in its own words.
   */
  reason: AdminUserCapabilityReason | null;
}
