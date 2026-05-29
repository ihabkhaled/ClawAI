import type { AiReasoningVisibility, AiStreamProgressConfidence, AiStreamStage } from '@/enums';

import type { StreamMetrics, StreamUsage } from './chat.types';

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
