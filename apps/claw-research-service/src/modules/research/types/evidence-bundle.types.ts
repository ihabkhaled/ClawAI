import type { ProviderSelectionMode } from '../../../common/enums/provider-selection-mode.enum';
import type { ResearchWorkflowKind } from '../../../common/enums/research-workflow-kind.enum';

/** Single citation unit that gets passed to the final answering model. */
export type EvidenceItem = {
  /** Stable id for citation rendering (e.g. [1]). */
  id: string;
  title: string | null;
  url: string;
  /** Short snippet or extracted excerpt (truncated). */
  snippet: string;
  /** Which tool produced this item. */
  source: 'search' | 'fetch' | 'scrape' | 'repo';
  /** Which provider kind produced this item (e.g. TAVILY, OLLAMA_WEB). */
  providerKind: string | null;
  publishedAt: string | null;
  fetchedAt: string | null;
  /** Confidence in usefulness for this intent (0..1). */
  confidence: number;
  /**
   * Profile-specific structured data (headings, outline, tables, …)
   * populated by the SEARCH_FETCH_EXTRACT workflow. Undefined for
   * plain search/fetch items.
   */
  structured?: Record<string, unknown>;
};

/** A trace entry describing a phase of the research run. */
export type ResearchTraceEntry = {
  phase: string;
  status: 'ok' | 'warning' | 'error' | 'skipped';
  latencyMs: number | null;
  message: string | null;
  timestamp: string;
};

/** Normalized bundle passed to the final model. */
export type EvidenceBundle = {
  intent: string;
  workflow: ResearchWorkflowKind;
  requestedModel: string | null;
  requestedProvider: string | null;
  providerSelection: {
    providerId: string | null;
    providerName: string | null;
    providerKind: string | null;
    selectionMode: ProviderSelectionMode;
    fallbackUsed: boolean;
    attemptedProviders: string[];
  };
  helperModels: string[];
  toolsUsed: string[];
  items: EvidenceItem[];
  /** Warnings, failed tools, truncation notes. */
  warnings: string[];
  generatedAt: string;
  /** "detailed" keeps full snippets, "compressed" trims to ~200 chars each. */
  mode: 'detailed' | 'compressed';
};

export type BuildEvidenceInput = {
  intent: string;
  workflow: ResearchWorkflowKind;
  requestedModel: string | null;
  requestedProvider: string | null;
  providerSelection: EvidenceBundle['providerSelection'];
  helperModels: string[];
  toolsUsed: string[];
  items: EvidenceItem[];
  warnings: string[];
  mode?: 'detailed' | 'compressed';
};
