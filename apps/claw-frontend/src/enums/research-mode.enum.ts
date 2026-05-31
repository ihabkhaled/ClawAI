// Canonical research-mode enum. Mirrors the backend single-source-of-truth
// at apps/claw-chat-service/src/common/enums/research-mode.enum.ts.
//
// Previously two parallel dialects coexisted: an OFF / SEARCH_ONLY /
// SEARCH_THEN_FETCH / SEARCH_FETCH_EXTRACT union for the single-message
// composer AND a NONE / SEARCH / SEARCH_FETCH / SEARCH_EXTRACT enum for
// compare mode. Both flows now use the same enum; the wire boundary in
// chat-service maps to the legacy research-service `ResearchWorkflow`
// dialect.
export enum ResearchMode {
  NONE = 'NONE',
  SEARCH = 'SEARCH',
  SEARCH_FETCH = 'SEARCH_FETCH',
  SEARCH_EXTRACT = 'SEARCH_EXTRACT',
}
