import type { AiReasoningVisibility, AiStreamProgressConfidence, AiStreamStage } from '@/enums';

import type { LaneStreamState, StreamMetrics, StreamUsage } from './chat.types';
import type { FileDeliveryEntry } from './file-delivery.types';

export type StreamProgressBarProps = {
  percent: number;
  confidence?: AiStreamProgressConfidence;
  className?: string;
};

export type StreamStageBadgeProps = {
  stage?: AiStreamStage;
  className?: string;
};

export type StreamMetricsHudProps = {
  metrics?: StreamMetrics;
  usage?: StreamUsage;
  className?: string;
};

export type StreamThinkingPanelProps = {
  reasoning: string;
  visibility?: AiReasoningVisibility;
  className?: string;
};

export type StreamLiveAnswerProps = {
  content: string;
  isStreaming: boolean;
  className?: string;
};

export type ParallelLaneCardProps = {
  provider: string;
  model: string;
  lane?: LaneStreamState;
  // Per-lane file-delivery summary populated after the terminal compare message
  // lands. Optional during streaming (BE writes `metadata.fileDelivery` only at
  // completion). Drives the AttachmentDeliveryChip in the card footer.
  attachmentDelivery?: FileDeliveryEntry[];
};

// Props for AttachmentDeliveryChip. Pure presentational; renders a compact
// chip strip summarising per-lane file delivery (text / image / skipped /
// truncated) with a hover tooltip listing each filename + mode + reason.
// Backed by `metadata.fileDelivery` written by chat-service per parallel
// lane and surfaced on `ParallelModelResponse.attachmentDelivery`.
export type AttachmentDeliveryChipProps = {
  delivery: FileDeliveryEntry[];
};
