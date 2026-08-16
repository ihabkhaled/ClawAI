/**
 * Version tag stamped on every judge/critic/quality signal
 * `RouterShadowEvaluationManager` reads or reports.
 *
 * Nothing in `RoutingOutcomeRecord` (judgeOutcome, judgeConfidence,
 * criticScore) carries a rubric version today, so a future change to how
 * those fields are scored — a new judge prompt, a different confidence
 * calibration — would otherwise mix silently with old data in any report
 * that reads them. Bump this string when the interpretation changes; never
 * reinterpret history under an existing version.
 */
export const ROUTING_JUDGE_RUBRIC_VERSION = 'routing-judge-rubric-v1';

/**
 * Matches the truncation `ReplayManager.replaySingleDecision` already applies
 * to `messagePreview` (see replay.manager.ts). Kept identical so a redacted
 * preview means the same thing everywhere in routing-service.
 */
export const COMPARISON_MESSAGE_PREVIEW_LENGTH = 120;

// ─── Safe, stable reason codes ───────────────────────────────────────────
// Never a raw error, a stack trace, or provider output — same discipline as
// ChainEntryExclusionReason and the CLOUD_ROUTER_UNAVAILABLE_* constants.

export const LEGACY_QUALITY_UNAVAILABLE_NO_OUTCOME = 'NO_OUTCOME_RECORD';
export const LEGACY_QUALITY_UNAVAILABLE_NOT_JUDGED = 'NOT_JUDGED';
export const LEGACY_COST_UNAVAILABLE_REASON = 'NO_COST_CLASS_RECORDED';

/** A shadow decision is never served, so it can never have been judged. */
export const CLOUD_QUALITY_UNAVAILABLE_SHADOW_ONLY = 'NOT_EXECUTED_SHADOW_ONLY';

/**
 * CloudRouterEligibilityManager does hard policy filtering only — "no
 * scoring" by its own doc comment — and ModelCostVersion (the correct,
 * versioned cost source) is empty and unconsumed per
 * docs/architecture/cloud-smart-router/IMPLEMENTATION_PLAN.md §5. Reporting
 * a fabricated cost figure here would be worse than admitting it is unknown,
 * the same tradeoff BillingModel.UNKNOWN already encodes for Ollama Cloud.
 */
export const CLOUD_COST_UNAVAILABLE_REASON = 'CLOUD_ROUTER_DOES_NOT_RANK_BY_COST';
