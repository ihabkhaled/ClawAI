import { Injectable, Logger } from '@nestjs/common';

import {
  LEARNING_DEFAULT_CONFIDENCE,
  LEARNING_EDIT_LENGTH_RATIO_EXPAND,
  LEARNING_EDIT_LENGTH_RATIO_SHORTEN,
  LEARNING_MAX_PREFERENCE_CONTENT_LENGTH,
  LEARNING_REJECT_REASON_MIN_LENGTH,
} from '../constants/learning.constants';
import type { AiActionDecisionEvent, ProposedPreference } from '../types/learning.types';

@Injectable()
export class PreferenceClassifierManager {
  private readonly logger = new Logger(PreferenceClassifierManager.name);

  /**
   * Heuristic v1: emit 0..N preferences from a single decision event.
   * The full LLM-backed classifier (planned for v1.x) plugs in here later.
   */
  classify(event: AiActionDecisionEvent): ProposedPreference[] {
    this.logger.debug(`classify: decision=${event.decision} actionKind=${event.actionKind}`);
    switch (event.decision) {
      case 'EDITED':
        return this.classifyEdit(event);
      case 'REJECTED':
        return this.classifyReject(event);
      case 'APPROVED':
      case 'AUTO_APPROVED':
        return this.classifyApprove(event);
      default:
        return [];
    }
  }

  private classifyEdit(event: AiActionDecisionEvent): ProposedPreference[] {
    if (event.editDiff === null || event.editDiff === undefined) return [];
    const before = event.editDiff.before.length;
    const after = event.editDiff.after.length;
    if (before === 0) return [];
    const ratio = after / before;
    if (ratio <= LEARNING_EDIT_LENGTH_RATIO_SHORTEN) {
      return [
        this.makePref(
          event.actionKind,
          `User prefers shorter ${event.actionKind} drafts (typical edit shrank length by ${this.percentDrop(ratio)}%).`,
          0.6,
          this.snippet(event.editDiff.after, 140),
        ),
      ];
    }
    if (ratio >= LEARNING_EDIT_LENGTH_RATIO_EXPAND) {
      return [
        this.makePref(
          event.actionKind,
          `User prefers more detail in ${event.actionKind} drafts (typical edit expanded length).`,
          0.55,
          this.snippet(event.editDiff.after, 140),
        ),
      ];
    }
    return [];
  }

  private classifyReject(event: AiActionDecisionEvent): ProposedPreference[] {
    const reason = event.reasonText ?? '';
    if (reason.length < LEARNING_REJECT_REASON_MIN_LENGTH) return [];
    return [
      this.makePref(
        event.actionKind,
        `User rejects ${event.actionKind} suggestions when: ${this.snippet(reason, 140)}`,
        0.5,
        this.snippet(reason, 140),
      ),
    ];
  }

  private classifyApprove(event: AiActionDecisionEvent): ProposedPreference[] {
    // Stream 40.1 — approval alone is a weak signal individually, but the
    // pattern accumulates: emit a low-confidence "user accepts ${actionKind}
    // suggestions on ${provider}" preference. The PreferenceUpsertService
    // dedups identical content, so repeat approvals strengthen the same row
    // (raising its evidence count) rather than spawning duplicates.
    if (event.provider === null) return [];
    return [
      this.makePref(
        event.actionKind,
        `User regularly approves ${event.actionKind} suggestions on ${event.provider}.`,
        0.35,
        `Approved on ${event.provider}`,
      ),
    ];
  }

  private makePref(
    actionKind: string,
    content: string,
    confidence: number,
    evidence: string,
  ): ProposedPreference {
    return {
      content: content.slice(0, LEARNING_MAX_PREFERENCE_CONTENT_LENGTH),
      confidence: Math.max(0, Math.min(1, confidence)),
      actionKind,
      evidence: evidence.slice(0, LEARNING_MAX_PREFERENCE_CONTENT_LENGTH),
    };
  }

  private snippet(text: string, max: number): string {
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}…`;
  }

  private percentDrop(ratio: number): number {
    return Math.round((1 - ratio) * 100);
  }

  // Exported for tests
  static readonly DEFAULT_CONFIDENCE = LEARNING_DEFAULT_CONFIDENCE;
}
