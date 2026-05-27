// Live workflow selector — Phase 6 of the semantic router flagship.
//
// This is the LIVE-WIRING selector that returns the kind of execution
// workflow the chat-service should actually run (SEARCH_FIRST today,
// DIRECT_LLM as the safe default, every other WorkflowKind marked
// honestly unavailable in `alternatives`). It is intentionally
// distinct from the legacy `WorkflowSelectorManager` (which still
// powers the modality/regex scaffolding) — both can coexist while
// downstream consumers migrate to the new shape.
//
// See docs/03-architecture/semantic-router-flagship-plan.md §Phase 6
// and the flagship prompt §9 "Workflow Selection" for the rationale.

import type { RoutingMode, WorkflowKind } from '../../../generated/prisma';
import type { SemanticIntentAnalysis } from '../../intelligence/types/semantic-intent-analysis.types';

// Reason codes for why an alternative workflow is not available today.
// `NOT_LIVE` means the BE/UI scaffolding exists but no executor has
// shipped yet. Stays in `alternatives` so the FE can render the
// honest "not yet available" banner instead of pretending the
// option works.
export type WorkflowAvailabilityReason = 'NOT_LIVE';

export type WorkflowAvailability = {
  workflow: WorkflowKind;
  available: boolean;
  reason: WorkflowAvailabilityReason;
};

export type LiveWorkflowKeywordSignal = {
  category: string;
  matchedTerms: string[];
};

export type WorkflowSelectorInput = {
  message: string;
  routingMode: RoutingMode;
  semanticIntent?: SemanticIntentAnalysis | null;
  keywordSignals?: LiveWorkflowKeywordSignal[];
  attachmentMimeTypes?: string[];
};

export type WorkflowSelection = {
  kind: WorkflowKind;
  reason: string;
  alternatives: WorkflowAvailability[];
};
