// v3 round 12 (2026-05-14) — Prompt 11: cross-workspace automation
// chain types.

// A single step in a chain. `payload` may contain
// {{steps.<stepId>.output.<field>}} placeholders that the executor
// resolves from the WriteActionResult of an EARLIER step.
export type ChainStep = {
  id: string;
  connectorId: string;
  actionType: string;
  payload: Record<string, unknown>;
};

export type ChainDsl = {
  steps: ChainStep[];
};

// Per-step run record returned to the caller.
export type ChainStepRunView = {
  stepId: string;
  stepIndex: number;
  connectorId: string;
  actionType: string;
  status: string;
  resolvedPayload: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  // Phase 06 — see chain-error-classifier.utility.ts. Only set when
  // status=FAILED.
  errorClass: string | null;
};

export type ChainRunView = {
  id: string;
  chainId: string;
  status: string;
  error: string | null;
  // Phase 06 — true once this run has gone through
  // ChainExecutorManager.resume() at least once.
  wasResumed: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  steps: ChainStepRunView[];
};

// The shape the placeholder resolver reads from: stepId → that step's
// WriteActionResult-ish output object.
export type ChainStepOutputs = Record<string, Record<string, unknown>>;

// Phase 07 — ChainTemplateService.instantiate's input shape.
export type InstantiateTemplateInput = {
  name: string;
  // provider (string, e.g. "JIRA") -> the caller's own connectorId for it.
  connectorSelections: Record<string, string>;
};
