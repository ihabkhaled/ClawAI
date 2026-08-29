import { BillingErrorCode, PaygSurface, TokenLedgerContext } from '@claw/shared-types';

/**
 * Which product surface each token-ledger context spends credit on.
 *
 * The ledger context is already threaded through every call site in this
 * service, so deriving the surface from it means a new orchestration mode is
 * metered the day it is added rather than the day someone remembers to meter
 * it. `rules/37-payg-credit-integrity.md` requires a surface for every paid
 * call; an unmapped context would be a silent hole, so `access-control.payg.spec.ts`
 * asserts one entry per `TokenLedgerContext` member. The key type is `string`
 * rather than the enum so the map can be read through `recordGet`, which is
 * how this codebase does runtime-keyed lookups.
 */
export const PAYG_SURFACE_BY_TOKEN_CONTEXT: Readonly<Record<string, PaygSurface>> = Object.freeze({
  [TokenLedgerContext.CHAT]: PaygSurface.CHAT,
  [TokenLedgerContext.REGENERATE]: PaygSurface.CHAT,
  [TokenLedgerContext.COMPARE]: PaygSurface.COMPARE,
  [TokenLedgerContext.JUDGE]: PaygSurface.JUDGE,
  [TokenLedgerContext.REPAIR]: PaygSurface.ORCHESTRATION,
  [TokenLedgerContext.VERIFY]: PaygSurface.ORCHESTRATION,
  [TokenLedgerContext.CONSENSUS]: PaygSurface.ORCHESTRATION,
  [TokenLedgerContext.ESCALATION_CHAIN]: PaygSurface.ORCHESTRATION,
  [TokenLedgerContext.BEST_OF_N]: PaygSurface.ORCHESTRATION,
  [TokenLedgerContext.COST_ENSEMBLE]: PaygSurface.ORCHESTRATION,
  [TokenLedgerContext.ROLE_PACK]: PaygSurface.ORCHESTRATION,
  [TokenLedgerContext.PIPELINE]: PaygSurface.ORCHESTRATION,
  [TokenLedgerContext.TASK_DECOMPOSITION]: PaygSurface.ORCHESTRATION,
  [TokenLedgerContext.FILE_GENERATION]: PaygSurface.FILE_GENERATION,
  [TokenLedgerContext.IMAGE_GENERATION]: PaygSurface.IMAGE,
  [TokenLedgerContext.ROUTING]: PaygSurface.ROUTING,
});

/**
 * Canonical connector provider name for the runtime tags this service uses.
 *
 * `local-ollama` and `local-llamacpp` are composer options, not connector rows.
 * auth-service keys its PAYG policy on the connector provider, and
 * `PAYG_EXEMPT_PROVIDERS` spells them `OLLAMA` / `LLAMACPP`, so sending the raw
 * tag would ask the meter about a provider it has never heard of — and a meter
 * outage would then fail CLOSED on a model running on the operator's own
 * hardware. This is a rename, not an exemption: the decision still belongs to
 * auth-service (ADR-082).
 */
export const PAYG_PROVIDER_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  'local-ollama': 'OLLAMA',
  'local-llamacpp': 'LLAMACPP',
});

/**
 * User-visible sentence for each refusal the meter can raise.
 *
 * The machine `code` on the exception is what the frontend maps to a localized
 * string; this text is the fallback the API returns and what an operator reads
 * in a log. It never names a provider rate, a plan ceiling or a margin —
 * `rules/28-billing-integrity-and-api-contracts.md` keeps those out of every
 * error payload.
 */
export const PAYG_CREDIT_ERROR_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  [BillingErrorCode.PAYG_CREDIT_EXHAUSTED]:
    'Your pay-as-you-go credit is used up. Add credit or switch to a local model to keep going.',
  [BillingErrorCode.PAYG_PROMPT_TOO_EXPENSIVE]:
    'This prompt costs more than the credit you have left. Add credit, shorten the prompt, or switch to a local model.',
  [BillingErrorCode.PAYG_MODEL_UNPRICED]:
    'This model has no published price yet, so it cannot be billed. Pick another model.',
  [BillingErrorCode.PAYG_PRICING_UNAVAILABLE]:
    'Credit checks are temporarily unavailable, so paid models are paused. Local models still work.',
});

/** Fallback sentence when the meter returns a code this build does not know. */
export const PAYG_CREDIT_FALLBACK_ERROR_MESSAGE =
  'This request could not be billed to your pay-as-you-go credit.';

/** Shown when the answer was shortened so it would fit the remaining balance. */
export const PAYG_CLAMPED_NOTICE_LABEL = 'Answer shortened to fit your credit';
export const PAYG_CLAMPED_NOTICE_DESCRIPTION =
  'There was not enough pay-as-you-go credit for a full-length answer, so the reply was capped. Add credit for the complete response.';
export const PAYG_CLAMPED_STAGE_ID = 'payg:clamped';

/** Workflow tags for the paths whose surface cannot be derived from the ledger context. */
export const PAYG_WORKFLOW_VISION_PROMPT = 'vision-prompt';
export const PAYG_WORKFLOW_FILE_CONTENT = 'file-content';
export const PAYG_WORKFLOW_CODING_AGENT = 'runtime-v2';
export const PAYG_WORKFLOW_CODING_AGENT_REPAIR = 'runtime-v2-repair';
export const PAYG_WORKFLOW_TOOL_LOOP = 'ollama-cloud-tool-loop';
export const PAYG_WORKFLOW_TOOL_LOOP_WRAPUP = 'ollama-cloud-tool-loop-wrapup';
export const PAYG_WORKFLOW_COMPARE_LANE = 'compare-lane';
export const PAYG_WORKFLOW_INTERNAL_GENERATE = 'internal-generate';

/**
 * Reserve every compare lane before any of them runs.
 *
 * A comparison with three error columns is not a comparison, and the user still
 * paid for the two that ran. So the run is all-or-nothing: if the lanes do not
 * fit the balance together, none of them is called and every hold already taken
 * is given straight back.
 */
export const PAYG_COMPARE_ALL_OR_NOTHING_CODE = 'PAYG_COMPARE_CREDIT_INSUFFICIENT';

/**
 * Workflow tags for the orchestration modes.
 *
 * `PaygSurface.ORCHESTRATION` alone answers "an advanced lab spent this", which
 * is not enough to settle a billing question - a user comparing their bill
 * against what they ran needs the mode name. Kept as constants so the string on
 * a ledger row and the string in a test are the same string.
 */
export const PAYG_WORKFLOW_CRITIC = 'critic';
export const PAYG_WORKFLOW_JUDGE = 'judge';
export const PAYG_WORKFLOW_JUDGE_REVISION = 'judge-revision';
export const PAYG_WORKFLOW_CONSENSUS = 'consensus';
export const PAYG_WORKFLOW_ESCALATION_CHAIN = 'escalation-chain';
export const PAYG_WORKFLOW_BEST_OF_N = 'best-of-n';
export const PAYG_WORKFLOW_COST_ENSEMBLE = 'cost-ensemble';
export const PAYG_WORKFLOW_ROLE_PACK = 'role-pack';
export const PAYG_WORKFLOW_PIPELINE = 'pipeline';
export const PAYG_WORKFLOW_TASK_DECOMPOSITION = 'task-decomposition';
export const PAYG_WORKFLOW_VERIFIER = 'verifier';
export const PAYG_WORKFLOW_ANSWER_REPAIR = 'answer-repair';
export const PAYG_WORKFLOW_COST_ENSEMBLE_CLASSIFY = 'cost-ensemble-classify';
