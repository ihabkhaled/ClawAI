import type { ResearchEvidenceBundle } from './research.types';

/**
 * Shape of the ChatMessage.metadata JSON field for USER-role messages.
 * ASSISTANT messages have a different metadata shape (provenance, routing,
 * etc.) handled elsewhere — this type is only for the user-facing payload.
 */
export type UserMessageMetadata = {
  fileIds?: string[];
  research?: {
    runId: string;
    mode: string;
    bundle: ResearchEvidenceBundle | Record<string, never>;
  };
};
