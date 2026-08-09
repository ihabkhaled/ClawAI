// Mirrors the `code` field on backend `BusinessException` payloads so the
// frontend can map machine-readable error codes to UX (e.g. plan upgrade CTA
// for PLAN_FEATURE_DISABLED, permission CTA for INSUFFICIENT_PERMISSIONS).
// Keep in lock-step with apps/claw-*-service/src/common/errors/*.exception.ts.
export enum ApiErrorCode {
  PLAN_FEATURE_DISABLED = 'PLAN_FEATURE_DISABLED',
  PLAN_TRIAL_EXPIRED = 'PLAN_TRIAL_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
}
