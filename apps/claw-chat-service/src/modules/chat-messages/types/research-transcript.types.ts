// Normalized research-transcript shape persisted on every assistant
// ChatMessage that ran the ResearchEnricherManager. Mirrors the
// buildToolTranscriptMetaPart pattern: a single typed metadata fragment that
// the FE renders under an expandable "Used N web sources" badge after a page
// refresh. Distinct from the legacy `metadata.research` bundle (full
// EvidenceBundle from /research/runs) — this is the lightweight enricher's
// flat source list with timing + warnings.

import type { ResearchMode } from '../../../common/enums/research-mode.enum';

export type ResearchTranscriptSource = {
  title: string;
  url: string;
  snippet?: string;
  extracted?: string;
  score?: number;
};

export type ResearchTranscript = {
  mode: ResearchMode;
  providerId?: string;
  providerName?: string;
  query: string;
  sources: ResearchTranscriptSource[];
  latencyMs: number;
  warnings: string[];
  searchRequestCount: number;
  fetchRequestCount: number;
};
