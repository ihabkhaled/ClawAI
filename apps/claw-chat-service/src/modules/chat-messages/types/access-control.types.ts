import { type PlanFeature } from '@claw/shared-entitlements';
import { type Permission } from '@claw/shared-types';

export type SendMessageAccessOptions = {
  provider?: string;
  model?: string;
  // Plan-feature gate the caller wants enforced alongside the model/quota
  // checks. When set, the user's resolved plan must unlock the gate (or the
  // user must be ADMIN) — otherwise a 403 BusinessException with code
  // PLAN_FEATURE_DISABLED is thrown. ADMIN bypasses via hasPlanFeature.
  requireFeature?: PlanFeature;
  // RBAC permission gate. Asserted alongside (not instead of) the model + quota
  // checks via the same entitlements payload. Missing the permission throws a
  // structured 403 INSUFFICIENT_PERMISSIONS contract (matching shared-
  // entitlements' PermissionGuard). ADMIN bypasses via hasPermission.
  requirePermission?: Permission;
};
