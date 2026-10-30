/**
 * A plan's per-call ceilings for a request the platform pays for (ADR-197).
 * `null` means no cap and `0` means refuse; they are never interchangeable.
 */
export type PlanCallLimits = {
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  maxCostMicroUsd: number | null;
};

export type PlanCallRequest = {
  promptTokens: number;
  cachedPromptTokens: number;
  cacheWritePromptTokens?: number;
  requestedMaxOutputTokens: number;
  imageUnits?: number;
  audioSeconds?: number;
  ttsCharacters?: number;
  videoSeconds?: number;
};

export type PlanCallOutcome =
  | { status: 'WITHIN'; maxOutputTokens: number }
  | { status: 'REFUSED'; reason: 'INPUT_TOO_LONG' | 'CALL_TOO_EXPENSIVE' };
