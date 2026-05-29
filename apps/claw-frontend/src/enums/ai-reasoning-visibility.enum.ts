// Mirrors backend AiReasoningVisibility. Drives the reasoning-panel label so
// the user knows whether thinking is provider-exposed or model-emitted.
export enum AiReasoningVisibility {
  NONE = 'none',
  PROVIDER_EXPOSED = 'provider_exposed',
  MODEL_EMITTED = 'model_emitted',
  SUMMARY_ONLY = 'summary_only',
}
