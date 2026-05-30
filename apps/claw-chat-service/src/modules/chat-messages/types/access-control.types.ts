import { type PlanFeature } from '@claw/shared-entitlements';

export type SendMessageAccessOptions = {
  provider?: string;
  model?: string;
  // Plan-feature gate the caller wants enforced alongside the model/quota
  // checks. When set, the user's resolved plan must unlock the gate (or the
  // user must be ADMIN) — otherwise a 403 BusinessException with code
  // PLAN_FEATURE_DISABLED is thrown. ADMIN bypasses via hasPlanFeature.
  requireFeature?: PlanFeature;
};
