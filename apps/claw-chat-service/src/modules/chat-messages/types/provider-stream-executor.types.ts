import { type AiStreamProtocol } from '../../../common/enums';

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
export type LoopState = {
  content: string;
  reasoning: string;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
  sawContent: boolean;
  lastMetricsAt: number;
  cancelled: boolean;
};
