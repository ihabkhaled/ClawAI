// Workflow selection types — Phase 6 of the semantic router flagship.
//
// Render contract for the workflow badge that sits under every assistant
// message. Backed by metadata persisted on `ChatMessage.metadata.workflow`
// + `metadata.searchFirst` by the chat-service.

import type { WorkflowKind } from '@/enums';

// Outcome of the SEARCH_FIRST workflow when it ran. `applied=false` plus
// a warning code means we ATTEMPTED to search but degraded — the FE
// should render that explicitly so users know we didn't silently skip.
export type SearchFirstOutcomeMetadata = {
  applied: boolean;
  resultCount: number;
  runId: string | null;
  warning: string | null;
};

export type WorkflowBadgeProps = {
  workflow: WorkflowKind | string | null;
  reason: string | null;
  searchFirst?: SearchFirstOutcomeMetadata;
};
