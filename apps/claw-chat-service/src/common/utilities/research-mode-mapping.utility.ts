import { ResearchMode } from '../enums/research-mode.enum';
import { ResearchWorkflow } from '../enums/research-workflow.enum';

/**
 * Maps the user-facing single-message {@link ResearchMode} (NONE / SEARCH /
 * SEARCH_FETCH / SEARCH_EXTRACT) to the research-service-facing
 * {@link ResearchWorkflow} (SEARCH_ONLY / SEARCH_THEN_FETCH /
 * SEARCH_FETCH_EXTRACT) so chat-service can speak ONE canonical research
 * dialect on the input side while still talking to research-service in its
 * existing workflow vocabulary on the wire.
 *
 * NONE is rejected at the call site (the chat-messages.service short-circuits
 * before calling research-service), so this function does not have a NONE
 * branch — passing it falls through to the SEARCH_ONLY default, which is the
 * safest "do at least a web search" interpretation for an unexpected value.
 *
 * Phase 2 will collapse `ResearchWorkflow` into the same `ResearchMode` enum
 * across services and remove this adapter. Today it lives as a one-line
 * mapping table so the migration is reversible.
 */
export function mapResearchModeToWorkflow(mode: ResearchMode): ResearchWorkflow {
  switch (mode) {
    case ResearchMode.SEARCH:
      return ResearchWorkflow.SEARCH_ONLY;
    case ResearchMode.SEARCH_FETCH:
      return ResearchWorkflow.SEARCH_THEN_FETCH;
    case ResearchMode.SEARCH_EXTRACT:
      return ResearchWorkflow.SEARCH_FETCH_EXTRACT;
    case ResearchMode.NONE:
    default:
      return ResearchWorkflow.SEARCH_ONLY;
  }
}
