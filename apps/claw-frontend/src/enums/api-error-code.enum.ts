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
  // Pay-as-you-go connector credit. Four codes rather than one because the
  // remedy differs: the first two are the user's wallet, the last two are ours.
  // Collapsing them would sell a top-up to somebody whose balance was fine.
  PAYG_CREDIT_EXHAUSTED = 'PAYG_CREDIT_EXHAUSTED',
  PAYG_PROMPT_TOO_EXPENSIVE = 'PAYG_PROMPT_TOO_EXPENSIVE',
  PAYG_MODEL_UNPRICED = 'PAYG_MODEL_UNPRICED',
  PAYG_PRICING_UNAVAILABLE = 'PAYG_PRICING_UNAVAILABLE',
  CREDIT_PACKAGE_NOT_FOUND = 'CREDIT_PACKAGE_NOT_FOUND',
  CREDIT_PACKAGE_INACTIVE = 'CREDIT_PACKAGE_INACTIVE',
  CREDIT_ADJUSTMENT_REASON_REQUIRED = 'CREDIT_ADJUSTMENT_REASON_REQUIRED',
  // The super-administrator invariant. Three codes, not one: "you may never do
  // this" and "you may, but not to yourself" need different copy, and the second
  // is what stops the super administrator filing a bug about their own row.
  // See rules/35-super-administrator-and-privilege-boundaries.md.
  SUPER_ADMIN_IMMUTABLE = 'SUPER_ADMIN_IMMUTABLE',
  SUPER_ADMIN_SELF_LOCKED = 'SUPER_ADMIN_SELF_LOCKED',
  SUPER_ADMIN_REQUIRED = 'SUPER_ADMIN_REQUIRED',
}
