// Search-first workflow types — Phase 6 of the semantic router flagship.
//
// When the routing decision arrives with `selectedWorkflow=SEARCH_FIRST`,
// chat-service calls the research-service search endpoint BEFORE invoking
// the LLM and folds the top results into the prompt as a structured
// citation block. See docs/03-architecture/semantic-router-flagship-plan.md
// §Phase 6 for the rollout plan.

export type SearchFirstResult = {
  id: string;
  title: string;
  url: string;
  snippet: string | null;
  publishedAt: string | null;
  source: string;
};

export type SearchFirstOutcome = {
  applied: boolean;
  results: SearchFirstResult[];
  runId: string | null;
  warning: string | null;
};

// Wire shape returned by claw-research-service POST /api/v1/research/search.
// Trimmed to the fields chat-service actually consumes.
export type ResearchSearchResponseEntry = {
  id: string;
  title: string;
  url: string;
  snippet: string | null;
  publishedAt: string | null;
  providerKind: string | null;
};

export type ResearchSearchResponse = {
  runId: string;
  providerKind: string;
  results: ResearchSearchResponseEntry[];
  warnings?: string[];
};
