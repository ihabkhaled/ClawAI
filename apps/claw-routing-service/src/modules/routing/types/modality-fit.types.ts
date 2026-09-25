import type { RequiredModality } from '@claw/shared-types';

/** The validated attachment fields of one `message.created` (multimodal batch 8). */
export type AttachmentModalityContext = {
  attachmentMimeTypes: string[];
  requiredModalities: RequiredModality[];
  transformableModalities: RequiredModality[];
};
