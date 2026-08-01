import type { ResearchEvidenceBundle } from './research.types';
import type { ResearchTranscript } from './research-transcript.types';

/**
 * Shape of the ChatMessage.metadata JSON field for USER-role messages.
 * ASSISTANT messages have a different metadata shape (provenance, routing,
 * etc.) handled elsewhere — this type is only for the user-facing payload.
 */
export type UserMessageMetadata = {
  clientIntent?: string;
  fileIds?: string[];
  modelDisplayName?: string;
  research?: {
    runId: string;
    mode: string;
    bundle: ResearchEvidenceBundle | Record<string, never>;
  };
  // Lightweight enricher transcript persisted alongside the heavy research
  // bundle. Mirrors the structured shape the FE renders for "used N web
  // sources". Distinct from `research.bundle` (full EvidenceBundle) — the
  // transcript is the flat source list with per-run latency + warnings.
  researchTranscript?: ResearchTranscript;
};
