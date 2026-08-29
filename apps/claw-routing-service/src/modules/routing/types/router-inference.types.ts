import type { RouterErrorCode } from '../../../common/enums';
import type { RouterProvider } from '../../../generated/prisma';

/** One ordered attempt target, resolved from configuration before the walk. */
export interface RouterChainEntryInput {
  /** Stable id so an attempt record points at the entry that produced it. */
  entryId: string;
  order: number;
  provider: RouterProvider;
  /** The id the provider expects on the wire. */
  providerModelId: string;
  deploymentId: string;
  attemptTimeoutMs: number;
  /** Retries WITHIN this entry, spent only on retryable failures. */
  retries: number;
  /**
   * Canonical RouterErrorCode names that route TO this entry. Empty means the
   * entry is reachable by ordinary chain order.
   */
  triggers: readonly string[];
}

/** What the coordinator hands an adapter. Never carries credentials. */
export interface RouterInferenceRequest {
  traceId: string;
  prompt: string;
  providerModelId: string;
  deploymentId: string;
  timeoutMs: number;
  /**
   * Set on the one bounded repair attempt. An adapter appends it so the model
   * sees its own malformed answer and the schema it broke.
   */
  repairHint?: string;
  /**
   * The output ceiling the provider must be called with.
   *
   * Set by the PAYG affordability clamp: when a user's credit cannot fund a
   * full-length answer the reservation returns a smaller ceiling, and the
   * provider then becomes physically incapable of producing a response that
   * costs more than the balance. Optional so an unmetered call — and every
   * existing test — keeps the adapter's own ROUTER_MAX_OUTPUT_TOKENS default.
   * When present it must be used verbatim, never the value that was asked for.
   */
  maxOutputTokens?: number;
}

/** A raw provider answer, before schema validation. */
export interface RouterInferenceSuccess {
  ok: true;
  raw: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface RouterInferenceFailure {
  ok: false;
  code: RouterErrorCode;
  /** Safe, provider-supplied summary. Never a payload or a stack trace. */
  safeMessage: string;
  latencyMs: number;
}

export type RouterInferenceResponse = RouterInferenceSuccess | RouterInferenceFailure;

/**
 * The port every router provider implements.
 *
 * Adapters translate one provider's wire format and errors into this shape and
 * nothing more — no retrying, no fallback, no chain awareness. Those belong to
 * the coordinator, so their behaviour is testable once rather than per provider.
 */
export interface RouterInferenceProvider {
  readonly provider: RouterProvider;
  invoke(request: RouterInferenceRequest): Promise<RouterInferenceResponse>;
}

/** One recorded attempt, whatever its outcome. */
export interface RouterAttemptRecord {
  entryId: string;
  order: number;
  attemptNumber: number;
  provider: RouterProvider;
  providerModelId: string;
  deploymentId: string;
  outcome: 'SUCCESS' | 'FAILURE';
  code: RouterErrorCode | null;
  safeMessage: string | null;
  latencyMs: number;
  /** True when this attempt was the single permitted schema repair. */
  wasRepair: boolean;
}

/** The validated decision a router model must produce. */
export interface RouterDecisionPayload {
  deploymentId: string;
  workflow: string;
  confidence: number;
  reasonCodes: string[];
}

export interface RouterCoordinatorSuccess {
  ok: true;
  decision: RouterDecisionPayload;
  attempts: RouterAttemptRecord[];
  /** How many entries were passed over before the one that answered. */
  fallbackDepth: number;
}

export interface RouterCoordinatorFailure {
  ok: false;
  /** Why the whole walk failed, not merely the last attempt. */
  code: RouterErrorCode;
  attempts: RouterAttemptRecord[];
  /** Deployments the walk decided are unfit to reselect. */
  quarantinedDeploymentIds: string[];
}

export type RouterCoordinatorResult = RouterCoordinatorSuccess | RouterCoordinatorFailure;

/**
 * Result of one chain entry. `stop` distinguishes "this entry is done, try the
 * next" from "the whole walk is over" — a distinction the caller cannot infer
 * from a failure alone, because cancellation and a plain model error look the
 * same at that level.
 */
export type RouterEntryOutcome =
  { ok: true; decision: RouterDecisionPayload } | { ok: false; stop: boolean };

/** Mutable bookkeeping for one chain walk. */
export interface RouterWalkState {
  attempts: RouterAttemptRecord[];
  quarantined: string[];
  skippedProviders: Set<RouterProvider>;
  lastCode: RouterErrorCode;
  deadlineAt: number;
}

export interface DecisionValidationSuccess {
  valid: true;
  decision: RouterDecisionPayload;
}

export interface DecisionValidationFailure {
  valid: false;
  /** Stable code, safe to put on a trace event. */
  rejection: string;
}

export type DecisionValidationResult = DecisionValidationSuccess | DecisionValidationFailure;

export interface RouterCoordinatorOptions {
  traceId: string;
  prompt: string;
  /**
   * Whose credit pays for the router's own inference (U5/U6).
   *
   * The router calls real paid models — Gemini and Ollama Cloud — to decide
   * where a message should go, and that spend used to reach `router_attempts`
   * and stop there. It travels from the `message.created` event that started
   * the walk.
   *
   * Optional because not every walk has one: an operator replay or a shadow
   * evaluation runs against no user's wallet. Those paths are left UNMETERED
   * rather than charged to an invented id — billing someone for a request they
   * did not make is worse than an unmetered internal call.
   */
  userId?: string;
  chain: readonly RouterChainEntryInput[];
  /** Wall-clock ceiling across every entry, retry and repair. */
  totalDeadlineMs: number;
  /** Hard ceiling on attempts across the whole walk. */
  maxAttempts: number;
  /** Below this, a valid decision is rejected as LOW_CONFIDENCE. */
  minConfidence: number;
  /** Deployment ids the decision is allowed to select. */
  eligibleDeploymentIds: readonly string[];
}
