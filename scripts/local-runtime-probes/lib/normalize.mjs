// scripts/local-runtime-probes/lib/normalize.mjs
//
// Pure-JS helper for building ClawRuntimeProgressEvent envelopes from inside
// the local-runtime probe scripts.
//
// Why this file is JS (not TS) even though the shared envelope type lives in
// packages/shared-types/src/runtime-progress/runtime-progress.types.ts:
// the probe scripts are throwaway operator tools that must run with zero
// build step (just `node scripts/local-runtime-probes/probe-*.mjs`). Pulling
// the TS shared package in would force a `tsgo` build before every probe
// run, which defeats the point of a quick-look diagnostic. We therefore
// mirror the envelope shape here as a plain JS factory, and keep field
// names character-for-character identical to the TS type so the JSONL
// output is parseable by any consumer that loads the shared TS type.
//
// If the TS envelope ever changes shape, update this file in lockstep —
// the runtime-progress.types.spec.ts unit test in shared-types is the
// source of truth for the field set.

import { randomUUID } from 'node:crypto';

// Mirrors RuntimeProgressEventType enum (packages/shared-types).
export const EventType = Object.freeze({
  LIFECYCLE: 'LIFECYCLE',
  REASONING_DELTA: 'REASONING_DELTA',
  CONTENT_DELTA: 'CONTENT_DELTA',
  IMAGE_PREVIEW: 'IMAGE_PREVIEW',
  NODE_PROGRESS: 'NODE_PROGRESS',
  STEP_PROGRESS: 'STEP_PROGRESS',
  PROMPT_EVAL_PROGRESS: 'PROMPT_EVAL_PROGRESS',
  METRICS: 'METRICS',
  USAGE: 'USAGE',
  ARTIFACT_SAVED: 'ARTIFACT_SAVED',
  ERROR: 'ERROR',
});

// Mirrors RuntimeProgressStage enum.
export const Stage = Object.freeze({
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  HEALTH_CHECK: 'HEALTH_CHECK',
  QUEUED: 'QUEUED',
  MODEL_LOADING: 'MODEL_LOADING',
  MODEL_WARMING_UP: 'MODEL_WARMING_UP',
  PROMPT_EVAL: 'PROMPT_EVAL',
  THINKING: 'THINKING',
  TOOL_CALLING: 'TOOL_CALLING',
  GENERATING: 'GENERATING',
  SAMPLING: 'SAMPLING',
  EXECUTING_NODE: 'EXECUTING_NODE',
  NODE_COMPLETED: 'NODE_COMPLETED',
  DECODING: 'DECODING',
  POST_PROCESSING: 'POST_PROCESSING',
  SAVING: 'SAVING',
  FINALIZING: 'FINALIZING',
  DONE: 'DONE',
  ERROR: 'ERROR',
  CANCELLED: 'CANCELLED',
});

// Mirrors RuntimeProvider enum.
export const Provider = Object.freeze({
  OLLAMA: 'OLLAMA',
  LLAMACPP: 'LLAMACPP',
  STABLE_DIFFUSION_WEBUI: 'STABLE_DIFFUSION_WEBUI',
  COMFYUI: 'COMFYUI',
});

// Mirrors RuntimeModality enum.
export const Modality = Object.freeze({
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  MULTIMODAL: 'MULTIMODAL',
});

// Mirrors RuntimeProgressConfidence enum.
export const Confidence = Object.freeze({
  EXACT: 'EXACT',
  RUNTIME_REPORTED: 'RUNTIME_REPORTED',
  TOKEN_BOUND: 'TOKEN_BOUND',
  HEURISTIC: 'HEURISTIC',
  STAGE_ESTIMATED: 'STAGE_ESTIMATED',
});

// Mirrors StreamingErrorType enum.
export const ErrorType = Object.freeze({
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  RUNTIME_UNREACHABLE: 'RUNTIME_UNREACHABLE',
  BINARY_NOT_INSTALLED: 'BINARY_NOT_INSTALLED',
  WEIGHTS_MISSING: 'WEIGHTS_MISSING',
  MODEL_LOAD_FAILED: 'MODEL_LOAD_FAILED',
  OOM: 'OOM',
  GPU_DRIVER_ERROR: 'GPU_DRIVER_ERROR',
  CONTEXT_OVERFLOW: 'CONTEXT_OVERFLOW',
  DECODER_ERROR: 'DECODER_ERROR',
  WORKFLOW_INVALID: 'WORKFLOW_INVALID',
  USER_CANCELLED: 'USER_CANCELLED',
  PROVIDER_RATE_LIMITED: 'PROVIDER_RATE_LIMITED',
});

// Mirrors VisibleReasoningSource enum.
export const VisibleReasoning = Object.freeze({
  NONE: 'NONE',
  OLLAMA_THINKING_FIELD: 'OLLAMA_THINKING_FIELD',
  THINK_TAG: 'THINK_TAG',
  THINKING_TAG: 'THINKING_TAG',
  REASONING_TAG: 'REASONING_TAG',
  LLAMACPP_REASONING_CONTENT: 'LLAMACPP_REASONING_CONTENT',
  MODEL_VISIBLE_TEXT: 'MODEL_VISIBLE_TEXT',
  PROVIDER_EXPOSED: 'PROVIDER_EXPOSED',
});

// Per-probe-run monotonically increasing sequence counter.
export function createSequenceCounter() {
  let n = 0;
  return () => {
    n += 1;
    return n;
  };
}

// Build a ClawRuntimeProgressEvent envelope.
//
// Required fields: runId, provider, modality, eventType, stage, sequence.
// Everything else is optional and gets spread in as-is. Missing fields are
// omitted from the object so the JSONL output stays compact.
export function buildEnvelope({
  runId,
  provider,
  modality,
  eventType,
  stage,
  sequence,
  conversationId,
  messageId,
  jobId,
  laneId,
  parallelGroupId,
  modelId,
  runtimeUrl,
  contentDelta,
  reasoningDelta,
  visibleReasoningSource,
  nodeId,
  nodeName,
  imagePreviewBase64,
  artifactId,
  metrics,
  rawProviderEventType,
  errorType,
  errorMessage,
}) {
  const env = {
    id: randomUUID(),
    runId,
    version: 'runtime-progress-v1',
    provider,
    modality,
    eventType,
    stage,
    createdAtMs: Date.now(),
    sequence,
  };
  if (conversationId !== undefined) env.conversationId = conversationId;
  if (messageId !== undefined) env.messageId = messageId;
  if (jobId !== undefined) env.jobId = jobId;
  if (laneId !== undefined) env.laneId = laneId;
  if (parallelGroupId !== undefined) env.parallelGroupId = parallelGroupId;
  if (modelId !== undefined) env.modelId = modelId;
  if (runtimeUrl !== undefined) env.runtimeUrl = runtimeUrl;
  if (contentDelta !== undefined) env.contentDelta = contentDelta;
  if (reasoningDelta !== undefined) env.reasoningDelta = reasoningDelta;
  if (visibleReasoningSource !== undefined) {
    env.visibleReasoningSource = visibleReasoningSource;
  }
  if (nodeId !== undefined) env.nodeId = nodeId;
  if (nodeName !== undefined) env.nodeName = nodeName;
  if (imagePreviewBase64 !== undefined) env.imagePreviewBase64 = imagePreviewBase64;
  if (artifactId !== undefined) env.artifactId = artifactId;
  if (metrics !== undefined) env.metrics = metrics;
  if (rawProviderEventType !== undefined) env.rawProviderEventType = rawProviderEventType;
  if (errorType !== undefined) env.errorType = errorType;
  if (errorMessage !== undefined) env.errorMessage = errorMessage;
  return env;
}

// Convenience: build a basic metrics object. progressConfidence is required.
export function buildMetrics({
  startedAtMs,
  elapsedMs,
  progressConfidence,
  ...rest
}) {
  return {
    startedAtMs,
    elapsedMs,
    progressConfidence,
    ...rest,
  };
}
