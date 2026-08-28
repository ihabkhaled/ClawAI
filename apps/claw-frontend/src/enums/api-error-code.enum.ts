// Mirrors the `code` field on backend `BusinessException` payloads so the
// frontend can map machine-readable error codes to UX (e.g. plan upgrade CTA
// for PLAN_FEATURE_DISABLED, permission CTA for INSUFFICIENT_PERMISSIONS).
// Keep in lock-step with apps/claw-*-service/src/common/errors/*.exception.ts.
export enum ApiErrorCode {
  PLAN_FEATURE_DISABLED = 'PLAN_FEATURE_DISABLED',
  PLAN_TRIAL_EXPIRED = 'PLAN_TRIAL_EXPIRED',
  MESSAGE_NOT_EDITABLE = 'MESSAGE_NOT_EDITABLE',
  MESSAGE_EDIT_UNCHANGED = 'MESSAGE_EDIT_UNCHANGED',
  QUOTA_DAILY_EXCEEDED = 'QUOTA_DAILY_EXCEEDED',
  QUOTA_WEEKLY_EXCEEDED = 'QUOTA_WEEKLY_EXCEEDED',
  QUOTA_MONTHLY_EXCEEDED = 'QUOTA_MONTHLY_EXCEEDED',
  PLAN_DAILY_CHAT_LIMIT_EXCEEDED = 'PLAN_DAILY_CHAT_LIMIT_EXCEEDED',
  PLAN_DAILY_MESSAGE_LIMIT_EXCEEDED = 'PLAN_DAILY_MESSAGE_LIMIT_EXCEEDED',
  PLAN_WORKSPACE_CONNECTION_LIMIT_EXCEEDED = 'PLAN_WORKSPACE_CONNECTION_LIMIT_EXCEEDED',
  PLAN_CONTEXT_PACK_LIMIT_EXCEEDED = 'PLAN_CONTEXT_PACK_LIMIT_EXCEEDED',
  PLAN_MEMORY_ITEM_LIMIT_EXCEEDED = 'PLAN_MEMORY_ITEM_LIMIT_EXCEEDED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  // The super-administrator invariant. Three codes, not one: "you may never do
  // this" and "you may, but not to yourself" need different copy, and the second
  // is what stops the super administrator filing a bug about their own row.
  // See rules/35-super-administrator-and-privilege-boundaries.md.
  SUPER_ADMIN_IMMUTABLE = 'SUPER_ADMIN_IMMUTABLE',
  SUPER_ADMIN_SELF_LOCKED = 'SUPER_ADMIN_SELF_LOCKED',
  SUPER_ADMIN_REQUIRED = 'SUPER_ADMIN_REQUIRED',
}
