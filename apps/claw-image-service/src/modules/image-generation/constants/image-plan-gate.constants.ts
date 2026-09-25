import { HttpStatus } from '@nestjs/common';
import { type PlanFeature } from '@claw/shared-entitlements';

/**
 * The plan gate image-service enforces on every generation entry (ADR-122).
 *
 * Image generation AND image edit (a reference image) are the paid half of the
 * media split: Free keeps image understanding, paid plans generate.
 */
export const IMAGE_GENERATION_PLAN_FEATURE: PlanFeature = 'allowImageGeneration';

/**
 * The refusal. Same code, status and wording as chat-service's
 * `assertFeatureEnabled`, so the frontend maps one PLAN_FEATURE_DISABLED to one
 * translated upgrade notice no matter which service refused.
 */
export const IMAGE_PLAN_FEATURE_DISABLED_CODE = 'PLAN_FEATURE_DISABLED';
export const IMAGE_PLAN_FEATURE_DISABLED_MESSAGE = 'Feature not available on your plan';

/**
 * auth-service could not answer. The gate fails CLOSED — an unresolvable
 * entitlement must not unlock a paid feature — with chat-service's code for
 * the same fault, so the fault is named as an outage, not as the user's plan.
 */
export const IMAGE_ENTITLEMENTS_UNAVAILABLE_CODE = 'ENTITLEMENTS_UNAVAILABLE';
export const IMAGE_ENTITLEMENTS_UNAVAILABLE_MESSAGE = 'Entitlements are temporarily unavailable';
export const IMAGE_ENTITLEMENTS_UNAVAILABLE_STATUS = HttpStatus.SERVICE_UNAVAILABLE;
