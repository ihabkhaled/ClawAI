// DEPRECATED alias. Both compare-mode and the single-message composer
// now share a single canonical `ResearchMode` enum (NONE / SEARCH /
// SEARCH_FETCH / SEARCH_EXTRACT). This file re-exports that enum under
// its legacy name so the foundation-step enum collapse can land without
// touching every caller at once — Phase 2 will sweep every
// `CompareResearchMode` import over to `ResearchMode` and delete this
// file outright.
//
// Do NOT add new code that depends on this alias.
export { ResearchMode as CompareResearchMode } from './research-mode.enum';
