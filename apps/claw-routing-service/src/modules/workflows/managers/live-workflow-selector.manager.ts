// Live workflow selector — Phase 6 of the semantic router flagship.
//
// Chooses ONE workflow kind for the chat-service to execute. Today
// the only live executor besides DIRECT_LLM is SEARCH_FIRST (the
// research-service is the dependency). Every other WorkflowKind is
// emitted as an `available: false` alternative so the FE can render
// the truth instead of dead dropdown options.
//
// Selection rules (priority order, first match wins):
//   1. SemanticIntent.requiresSearch === true → SEARCH_FIRST.
//   2. Any "fresh information" marker matches → SEARCH_FIRST.
//   3. Otherwise → DIRECT_LLM.
//
// Privacy class is NOT consulted here. Privacy is the router's job
// (handleLocalOnly / PRIVACY_FIRST modes) and workflow selection is
// orthogonal — a privacy-sensitive question can still benefit from
// SEARCH_FIRST against a self-hosted SearXNG.

import { Injectable, Logger } from '@nestjs/common';

import { matchKeyword } from '../../../common/utilities';
import { WorkflowKind } from '../../../generated/prisma';
import {
  LIVE_WORKFLOWS,
  SEARCH_FIRST_TRIGGER_KEYWORDS,
  WORKFLOW_REASON_DEFAULT_DIRECT,
  WORKFLOW_REASON_KEYWORD_FRESH_INFO_MARKER,
  WORKFLOW_REASON_NOT_LIVE,
  WORKFLOW_REASON_SEMANTIC_INTENT_REQUIRES_SEARCH,
} from '../constants/live-workflow-selector.constants';
import type {
  WorkflowAvailability,
  WorkflowSelection,
  WorkflowSelectorInput,
} from '../types/live-workflow-selector.types';

@Injectable()
export class LiveWorkflowSelectorManager {
  private readonly logger = new Logger(LiveWorkflowSelectorManager.name);

  selectWorkflow(input: WorkflowSelectorInput): WorkflowSelection {
    this.logger.debug(
      `selectWorkflow: mode=${input.routingMode} msgLen=${String(input.message.length)} hasSemanticIntent=${String(
        input.semanticIntent !== null && input.semanticIntent !== undefined,
      )}`,
    );

    const alternativesForKind = (chosen: WorkflowKind): WorkflowAvailability[] =>
      this.buildAlternatives(chosen);

    // Rule 1 — semantic intent flag wins over keyword absence.
    if (input.semanticIntent?.requiresSearch === true) {
      this.logger.log('selectWorkflow: SEARCH_FIRST via semantic intent');
      return {
        kind: WorkflowKind.SEARCH_FIRST,
        reason: WORKFLOW_REASON_SEMANTIC_INTENT_REQUIRES_SEARCH,
        alternatives: alternativesForKind(WorkflowKind.SEARCH_FIRST),
      };
    }

    // Rule 2 — fresh-info keyword markers (whole-word, plural-tolerant).
    if (this.matchesFreshInfoMarker(input.message)) {
      this.logger.debug('selectWorkflow: SEARCH_FIRST via fresh-info keyword marker');
      return {
        kind: WorkflowKind.SEARCH_FIRST,
        reason: WORKFLOW_REASON_KEYWORD_FRESH_INFO_MARKER,
        alternatives: alternativesForKind(WorkflowKind.SEARCH_FIRST),
      };
    }

    // Rule 3 — safe default.
    this.logger.debug('selectWorkflow: DIRECT_LLM (default)');
    return {
      kind: WorkflowKind.DIRECT_LLM,
      reason: WORKFLOW_REASON_DEFAULT_DIRECT,
      alternatives: alternativesForKind(WorkflowKind.DIRECT_LLM),
    };
  }

  private matchesFreshInfoMarker(message: string): boolean {
    if (message.length === 0) {
      return false;
    }
    // matchKeyword wraps every term in \b...\b with plural tolerance, so
    // "todays" matches "today" but "todays-newsletter" does NOT match
    // because the `-` is a word boundary that still requires the WHOLE
    // word "today" / "todays" to land between boundaries. That's the
    // behaviour we want: a real freshness marker, not a substring hit.
    return matchKeyword(message, SEARCH_FIRST_TRIGGER_KEYWORDS);
  }

  private buildAlternatives(chosen: WorkflowKind): WorkflowAvailability[] {
    const all = Object.values(WorkflowKind) as WorkflowKind[];
    const alternatives: WorkflowAvailability[] = [];
    for (const kind of all) {
      if (kind === chosen) {
        continue;
      }
      const isLive = LIVE_WORKFLOWS.includes(kind);
      alternatives.push({
        workflow: kind,
        available: isLive,
        reason: WORKFLOW_REASON_NOT_LIVE,
      });
    }
    return alternatives;
  }
}
