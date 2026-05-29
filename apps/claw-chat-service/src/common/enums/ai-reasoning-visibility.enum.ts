// Describes WHY a reasoning delta is safe to show. We never expose hidden
// chain-of-thought: only provider-exposed summaries or model-emitted visible
// thinking text (e.g. <think>...</think> from local/open models).
export enum AiReasoningVisibility {
  NONE = 'none',
  PROVIDER_EXPOSED = 'provider_exposed',
  MODEL_EMITTED = 'model_emitted',
  SUMMARY_ONLY = 'summary_only',
}
