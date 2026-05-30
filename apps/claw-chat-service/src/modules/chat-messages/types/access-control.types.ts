import { type PlanFeature } from '@claw/shared-entitlements';
import { type Permission } from '@claw/shared-types';

export type SendMessageAccessOptions = {
  provider?: string;
  model?: string;
  // Plan-feature gate(s) the caller wants enforced alongside the model/quota
  // checks. When set, the user's resolved plan must unlock EVERY listed gate
  // (or the user must be ADMIN) — otherwise a 403 BusinessException with code
  // PLAN_FEATURE_DISABLED is thrown on the first locked feature. ADMIN
  // bypasses via hasPlanFeature. Accepts either a single feature or an array
  // so a compare-mode call that also enables judge + research can assert all
  // three in one pass.
  requireFeature?: PlanFeature | readonly PlanFeature[];
  // RBAC permission gate. Asserted alongside (not instead of) the model + quota
  // checks via the same entitlements payload. Missing the permission throws a
  // structured 403 INSUFFICIENT_PERMISSIONS contract (matching shared-
  // entitlements' PermissionGuard). ADMIN bypasses via hasPermission.
  requirePermission?: Permission;
};
