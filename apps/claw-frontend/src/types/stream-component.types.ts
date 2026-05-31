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
//
// Dual-read (Slice D): when `messageId` is provided the chip will attempt a
// fresh fetch from `GET /chat-messages/:id/file-delivery` (authoritative
// `file_delivery_records` rows) and prefer its non-empty result. If the API
// returns an empty array, errors, or `messageId` is omitted, the chip falls
// back to the inline `delivery` array passed by the parent. This makes the
// component back-compatible with every existing call-site that only has the
// metadata read.
export type AttachmentDeliveryChipProps = {
  delivery: FileDeliveryEntry[];
  messageId?: string;
};
