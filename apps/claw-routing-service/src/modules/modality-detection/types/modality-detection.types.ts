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
