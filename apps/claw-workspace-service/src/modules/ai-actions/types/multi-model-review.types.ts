// v3 round 2 (2026-05-12) — Prompt 04: multi-model PR/MR review.
// Caller hands the orchestrator the diff + N reviewer models + an optional
// judge model. We fan-out the reviewers in parallel via the existing cloud
// generation pipeline, then optionally synthesise their verdicts with the
// judge model.

export type ReviewerModelRef = {
  provider: string;
  model: string;
  // Optional label the caller wants to surface in the UI (e.g. "Anthropic
  // Sonnet 4.6"). Defaults to `${provider}/${model}` when omitted.
  label?: string;
};

export type MultiModelReviewInput = {
  // The PR/MR body (or diff, or both) to review.
  content: string;
  /**
   * Whose PAYG credit pays for the fan-out.
   *
   * REQUIRED. This is the most expensive single request in the service: up to
   * five reviewer models plus a judge, every one of them a separate paid
   * provider call. Taken from the authenticated caller, never from the request
   * body — a body-supplied id would let anyone spend anyone else's credit.
   */
  userId: string;
  // 1-5 reviewer models. The orchestrator caps the array at 5 to bound cost.
  reviewerModels: ReviewerModelRef[];
  // Optional final synthesis model. When provided the orchestrator runs a
  // judge pass over the reviewers' outputs. When omitted, the result is just
  // the reviewers.
  judgeModel?: ReviewerModelRef;
  // Per-reviewer timeout (ms). Defaults to AppConfig AI_ACTION_REQUEST_TIMEOUT_MS.
  timeoutMs?: number;
};

export type ReviewerOutcome = {
  provider: string;
  model: string;
  label: string;
  success: boolean;
  // Present on success.
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  // Present on failure.
  errorMessage?: string;
};

export type JudgeOutcome = {
  provider: string;
  model: string;
  label: string;
  success: boolean;
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  errorMessage?: string;
};

export type MultiModelReviewResult = {
  reviewers: ReviewerOutcome[];
  judge: JudgeOutcome | null;
  // True if at least one reviewer succeeded. The caller decides whether to
  // proceed when only some reviewers came back (e.g. for AUTO_APPROVE).
  anyReviewerSucceeded: boolean;
};
