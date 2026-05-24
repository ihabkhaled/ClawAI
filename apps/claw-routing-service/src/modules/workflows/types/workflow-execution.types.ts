// SCAFFOLD: stream R.3 (04-r3-workflow-orchestrator)

import type { WorkflowKind } from '../../../generated/prisma';
import type {
  AttachmentMeta,
  DetectedUrl,
  ModalityDetectionResult,
} from '../../modality-detection/types/modality-detection.types';

export type WorkflowExecutionContext = {
  message: string;
  threadId?: string;
  userId: string;
  modalityResult: ModalityDetectionResult;
  attachments: AttachmentMeta[];
  urls: DetectedUrl[];
};

export type WorkflowStep =
  | {
      type: 'llm_call';
      provider: string;
      model: string;
      promptTemplate: string;
      inputFromStepId?: string;
    }
  | {
      type: 'extract';
      extractor:
        | 'pdf'
        | 'spreadsheet'
        | 'youtube_transcript'
        | 'web_scrape'
        | 'audio_transcribe'
        | 'video_extract';
      sourceFileId?: string;
      sourceUrl?: string;
    }
  | { type: 'search'; query: string }
  | { type: 'judge'; primaryStepId: string; criticStepId: string };

export type WorkflowPlan = {
  kind: WorkflowKind;
  steps: WorkflowStep[];
  estimatedDurationMs: number;
  estimatedCostUsd: number;
};

export type WorkflowChoice = {
  kind: WorkflowKind;
  confidence: number;
  plan: WorkflowPlan;
  reasonTags: string[];
  fallbackUsed: boolean;
};
