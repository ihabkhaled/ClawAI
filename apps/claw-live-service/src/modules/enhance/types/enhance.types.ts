export type ModelRef = { provider: string; model: string };

export type ModelRates = {
  inputPerMillionMicroUsd: number | null;
  outputPerMillionMicroUsd: number | null;
};

export type EnhanceEstimateView = {
  confirmed: false;
  eventId: string;
  eventVersion: number;
  modelId: string;
  estimatedMicroUsd: number;
};

export type EnhanceResultView = {
  confirmed: true;
  enhancementId: string;
  eventId: string;
  eventVersion: number;
  modelId: string;
  body: string;
  costMicroUsd: number;
  /** True when this answer was stored by an earlier call with the same idempotency key. */
  replayed: boolean;
};

export type Resolved = { event: EnhanceEventRow; sessionId: string; ref: ModelRef };

export type EnhanceEventRow = {
  id: string;
  runId: string;
  version: number;
  startAt: bigint;
  endAt: bigint | null;
  title: string;
  body: string;
  evidence: unknown;
};

export type StoredEnhancement = {
  id: string;
  userId: string;
  eventId: string;
  eventVersion: number;
  modelId: string;
  body: string;
  costMicroUsd: bigint;
};

export type NewEnhancement = {
  userId: string;
  sessionId: string;
  runId: string;
  eventId: string;
  eventVersion: number;
  modelId: string;
  body: string;
  costMicroUsd: number;
  requestId: string;
  policyVersion: number;
};

export type GenerateRequest = {
  userId: string;
  requestId: string;
  provider: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
};

export type GenerateResult = { content: string; costMicroUsd: number };

export type EnhancePrompt = { systemPrompt: string; userPrompt: string };
