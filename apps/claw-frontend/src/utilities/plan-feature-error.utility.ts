import { ApiErrorCode, PlanFeature } from '@/enums';
import type { ApiClientError } from '@/services/shared/api-client';

// When the backend rejects a request because the user's plan does not unlock a
// feature (judge, critic, research, ...) it throws BusinessException with code
// PLAN_FEATURE_DISABLED. The error message itself is generic
// ("Feature not available on your plan"), so we infer which specific gate
// failed from the request payload that triggered the rejection. This keeps
// the BE contract narrow while the FE renders a precise upgrade CTA.
//
// Callers pass which feature(s) they REQUESTED in priority order — the first
// feature in the array is the one most worth advertising to the user (e.g.
// for a parallel compare with judge+critic enabled, list criticReview first
// since it implies the judge gate too).
export function detectPlanFeatureGate(
  error: unknown,
  requestedFeatures: readonly PlanFeature[],
): PlanFeature | null {
  if (!isApiClientError(error)) {
    return null;
  }
  if (error.code !== ApiErrorCode.PLAN_FEATURE_DISABLED) {
    return null;
  }
  if (error.status !== 403) {
    return null;
  }
  // Pick the first plausibly-locked feature in the caller-provided priority
  // order. We do not have the exact server-side feature name in the payload
  // today, so the priority list IS the heuristic.
  return requestedFeatures[0] ?? null;
}

function isApiClientError(error: unknown): error is ApiClientError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name: string }).name === 'ApiClientError'
  );
}
