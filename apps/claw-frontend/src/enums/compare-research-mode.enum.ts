// Compare-mode research enricher. Mirrors backend
// apps/claw-chat-service/src/common/enums/research-mode.enum.ts.
//
// Distinct from `ResearchMode` (which mirrors the per-message
// ResearchWorkflow on createMessageSchema — OFF/SEARCH_ONLY/SEARCH_THEN_
// FETCH/SEARCH_FETCH_EXTRACT). `CompareResearchMode` is the lightweight,
// compare-time control. Wire value passed over /chat-messages/parallel as
// `researchMode`.
export enum CompareResearchMode {
  NONE = 'NONE',
  SEARCH = 'SEARCH',
  SEARCH_FETCH = 'SEARCH_FETCH',
  SEARCH_EXTRACT = 'SEARCH_EXTRACT',
}
