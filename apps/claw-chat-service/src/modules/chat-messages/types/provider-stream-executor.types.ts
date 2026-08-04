import { type AiStreamProtocol, type AiStreamStage } from '../../../common/enums';
import {
  type ProviderStreamFinalTimings,
  type StreamToolCallPayload,
} from './provider-stream.types';
import { type StreamStageTimestamps } from './stream.types';

// Per-emit context: identifies which stream + lane an emitted fragment belongs
// to so the SSE channel can route it. parallelGroupId/laneId are set only for
// the compare/parallel flow; messageId is set once the assistant row exists.
export type EmitCtx = {
  threadId: string;
  provider: string;
  model: string;
  messageId?: string;
  laneId?: string;
  parallelGroupId?: string;
  protocol: AiStreamProtocol;
};

// Mutable state of the read→normalize→split→emit loop for one streaming run.
// Accumulates assistant content + reasoning, tracks token counts the provider
// reports, throttles metric emits, and carries the cooperative-cancel flag.
// stageTimings records the wall-clock window each lifecycle stage occupied so
// the FE can render a stage timeline + bottleneck breakdown.
// finalTimings holds the nanosecond-precision durations from Ollama's final
// frame, threaded through to the finalize() rich-metrics emit.
export type LoopState = {
  content: string;
  reasoning: string;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
  sawContent: boolean;
  lastMetricsAt: number;
  cancelled: boolean;
  currentStage?: AiStreamStage;
  stageTimings: Map<AiStreamStage, StreamStageTimestamps>;
  finalTimings?: ProviderStreamFinalTimings;
  // Native tool calls the model requested, released whole by the reader at the
  // terminal frame. Empty on every ordinary streamed answer.
  toolCalls?: readonly StreamToolCallPayload[];
};
