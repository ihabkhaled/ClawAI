import type { RequiredModality } from '@claw/shared-types';

/**
 * The attachment half of `message.created` (multimodal batch 8). Every field
 * absent when the turn has no attachments, so the event is byte-for-byte what
 * it was before.
 */
export type AttachmentModalityFields = {
  attachmentMimeTypes?: string[];
  requiredModalities?: RequiredModality[];
  transformableModalities?: RequiredModality[];
};

/** file-service's readiness answer, the part the modality lookup reads. */
export type FileIngestionStateWire = {
  mimeType?: unknown;
};
