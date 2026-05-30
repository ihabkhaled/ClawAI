// Compare-mode research enricher modes (added 2026-05-30).
//
// Distinct from `ResearchWorkflow` (single-message orchestrator that returns
// an EvidenceBundle persisted on the user message). `ResearchMode` is the
// lightweight compare-time control: it grounds every parallel lane on the
// same on-the-fly web evidence so non-browsing models (Kimi, GLM, …) can
// answer "current"-flavored prompts without refusing to browse.
//
// Mapping to research-service endpoints lives in
// research-enricher.manager.ts. SEARCH_EXTRACT currently falls back to
// /research/fetch's cleaned `content` field — see the audit note in the
// implementation report for the rationale.
export enum ResearchMode {
  NONE = 'NONE',
  SEARCH = 'SEARCH',
  SEARCH_FETCH = 'SEARCH_FETCH',
  SEARCH_EXTRACT = 'SEARCH_EXTRACT',
}
