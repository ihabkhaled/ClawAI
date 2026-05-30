export const RUNTIME_PROGRESS_EVENT_PATTERNS = Object.freeze({
  STAGE_CHANGED: 'runtime.progress.stage_changed',
  CONTENT_DELTA: 'runtime.progress.content_delta',
  REASONING_DELTA: 'runtime.progress.reasoning_delta',
  METRICS_TICK: 'runtime.progress.metrics_tick',
  USAGE_FINAL: 'runtime.progress.usage_final',
  IMAGE_PREVIEW: 'runtime.progress.image_preview',
  NODE_PROGRESS: 'runtime.progress.node_progress',
  STEP_PROGRESS: 'runtime.progress.step_progress',
  PROMPT_EVAL_PROGRESS: 'runtime.progress.prompt_eval_progress',
  ARTIFACT_SAVED: 'runtime.progress.artifact_saved',
  ERROR: 'runtime.progress.error',
  CANCELLED: 'runtime.progress.cancelled',
} as const);

export type RuntimeProgressEventPattern =
  (typeof RUNTIME_PROGRESS_EVENT_PATTERNS)[keyof typeof RUNTIME_PROGRESS_EVENT_PATTERNS];
