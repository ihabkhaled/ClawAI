// SCAFFOLD: stream R.2 (03-r2-multimodal-intent-detection)

import type { ModalityKind, WorkflowKind } from '../../../generated/prisma';

export type AttachmentMeta = {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type DetectedUrl = {
  url: string;
  kind: 'youtube' | 'web';
};

export type ModalityDetectionResult = {
  detectedModalities: ModalityKind[];
  workflowHint?: WorkflowKind;
  workflowConfidence: number;
  reasonTags: string[];
  fileMetadata: AttachmentMeta[];
  urlMetadata: DetectedUrl[];
  fallback?: { reason: string; tag: string };
};

// Per-manager partial result types — extracted to avoid inline string-literal
// unions inside Pick<>, which the routing-service eslint config bans in
// logic files.
export type UrlIntentResult = Pick<
  ModalityDetectionResult,
  'detectedModalities' | 'urlMetadata' | 'workflowHint' | 'reasonTags'
>;

export type AttachmentIntentResult = Pick<
  ModalityDetectionResult,
  'detectedModalities' | 'fileMetadata' | 'workflowHint' | 'reasonTags'
>;

export type ToolCallingIntentResult = {
  needsToolCalling: boolean;
  reasonTag?: string;
};

export type StreamingIntentResult = {
  needsStreaming: boolean;
};

export type EmbeddingIntentResult = {
  isEmbeddingTask: boolean;
  reasonTag?: string;
};
