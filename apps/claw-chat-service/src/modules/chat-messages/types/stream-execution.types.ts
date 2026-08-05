import { type AiStreamProtocol } from '../../../common/enums';
import { type StreamToolCallPayload } from './provider-stream.types';
import { type StreamMetrics } from './stream.types';

// Fully-built streaming request handed to ProviderStreamExecutor. The caller
// (ChatExecutionManager) owns request construction + provider config so the
// executor stays provider-agnostic and only runs the read/normalize/emit loop.
export type StreamExecutionInput = {
  threadId: string;
  messageId?: string;
  laneId?: string;
  parallelGroupId?: string;
  provider: string;
  model: string;
  url: string;
  headers?: Record<string, string>;
  body: unknown;
  protocol: AiStreamProtocol;
  startMs: number;
  promptTokensEstimate: number;
  maxOutputTokens?: number;
  timeoutMs: number;
  abortSignal: AbortSignal;
};

export type StreamExecutionResult = {
  content: string;
  reasoning: string;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
  cancelled: boolean;
  // Native tool calls, in the raw shape the stream's own protocol produced.
  // The caller reverse-maps them with `normalizeToolCalls` under the matching
  // dialect. Absent on every ordinary streamed answer.
  toolCalls?: readonly StreamToolCallPayload[];
  // Measured stream metrics, so the caller can report OBSERVED throughput
  // rather than a figure inferred from the requested speed tier.
  finalMetrics?: StreamMetrics;
};

// Per-run identity threaded from the execution loop into the leaf provider
// call so it can emit live deltas on the right thread/message. Absent =>
// non-streaming buffered path (e.g. judge/parallel in slice 1).
export type StreamContext = {
  threadId: string;
  messageId: string;
  // Set for parallel/compare runs so each model streams on its own lane.
  laneId?: string;
  parallelGroupId?: string;
};

// Input for the simulated path: provider could not stream natively, so a
// fully-buffered response is chunked client-side after arrival. Used by the
// local-Ollama path and the deterministic mock provider.
export type SimulatedStreamInput = {
  threadId: string;
  messageId?: string;
  laneId?: string;
  parallelGroupId?: string;
  provider: string;
  model: string;
  fullContent: string;
  reasoningContent?: string;
  inputTokens?: number;
  outputTokens?: number;
  startMs: number;
  promptTokensEstimate: number;
  maxOutputTokens?: number;
  abortSignal?: AbortSignal;
};
