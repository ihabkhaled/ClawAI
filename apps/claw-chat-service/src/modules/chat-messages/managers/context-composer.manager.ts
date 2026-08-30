import { Injectable, Logger } from '@nestjs/common';
import { type ChatMessage } from '../../../generated/prisma';
import {
  MIN_TURNS_FLOOR,
  RECENT_TURNS_ALWAYS_KEPT,
  RETRIEVAL_SCORE_THRESHOLD,
} from '../constants/context-composer.constants';
import { ContextOmissionReason } from '../enums/context-omission-reason.enum';
import { ContextPriority } from '../enums/context-priority.enum';
import {
  type ConversationContextManifest,
  type ConversationTurn,
  type ModelTokenBudget,
  type OmittedMessage,
  type ScoredTurn,
  type SelectedConversation,
} from '../types/context-composer.types';
import { flattenTurns, groupIntoTurns } from '../utilities/conversation-turns.utility';
import { scoreTurnRelevance } from '../utilities/history-relevance.utility';
import { detectReferenceSignal } from '../utilities/reference-signal.utility';

/**
 * Chooses which of a thread's messages reach the model, and records why.
 *
 * The design rule, stated once so it is not lost in the code below:
 *
 *   NOTHING IN THIS CLASS REMOVES A MESSAGE FOR BEING IRRELEVANT.
 *   The only reason a message is left out is that the token budget ran out.
 *
 * The previous selector removed messages for three reasons that had nothing to
 * do with budget — being older than the twentieth, being an ASSISTANT message,
 * and scoring under 0.45 on word overlap with the current question. On a 256k
 * model with a mostly empty prompt, it routinely sent one message. Relevance
 * here decides ORDER, and order only matters once the budget is actually full.
 */
@Injectable()
export class ContextComposerManager {
  private readonly logger = new Logger(ContextComposerManager.name);

  select(
    messages: readonly ChatMessage[],
    budget: ModelTokenBudget,
    options: { currentIntent?: string } = {},
  ): SelectedConversation {
    const turns = groupIntoTurns(messages);
    const intent = options.currentIntent ?? this.lastUserContent(messages);
    const referenceSignal = detectReferenceSignal(intent);
    const warnings: string[] = [];

    if (turns.length === 0) {
      return {
        included: [],
        manifest: this.emptyManifest(messages.length, budget, referenceSignal, warnings),
      };
    }

    const scored = this.classify(turns, intent);
    const { kept, omittedTurns, spent } = this.fitToBudget(scored, budget, warnings);

    const included = flattenTurns(kept.map((entry) => entry.turn));
    const omitted = this.describeOmissions(omittedTurns);

    this.logger.debug(
      `select: ${String(included.length)}/${String(messages.length)} messages, ` +
        `${String(kept.length)}/${String(turns.length)} turns, ` +
        `${String(spent)}/${String(budget.availableInputTokens)} input tokens, ` +
        `window=${String(budget.contextWindowTokens)} (${budget.source}), ` +
        `referential=${String(referenceSignal.referential)} [${referenceSignal.signals.join(',')}]`,
    );

    return {
      included,
      manifest: {
        totalThreadMessages: messages.length,
        includedMessageIds: included.map((message) => message.id),
        includedTurnCount: kept.length,
        omitted,
        estimatedInputTokens: spent,
        budget,
        referenceSignal,
        warnings,
      },
    };
  }

  /**
   * Assigns every turn a priority class.
   *
   * P0 — the newest turn. It contains the prompt being answered.
   * P1 — the most recent complete turns. Sent regardless of subject, because
   *      "is this relevant" is not answerable about the turn the user is in the
   *      middle of.
   * P2 — older turns that score above the retrieval threshold.
   * P3 — everything else, still eligible if the budget has room.
   */
  private classify(turns: readonly ConversationTurn[], intent: string): ScoredTurn[] {
    const newestTurnIndex = turns.length - 1;
    const recentFrom = Math.max(0, turns.length - RECENT_TURNS_ALWAYS_KEPT);

    return turns.map((turn): ScoredTurn => {
      if (turn.index === newestTurnIndex) {
        return { turn, priority: ContextPriority.P0_REQUIRED, score: 1, reasons: ['current-turn'] };
      }
      if (turn.index >= recentFrom) {
        return { turn, priority: ContextPriority.P1_RECENT, score: 1, reasons: ['recent-window'] };
      }
      const { score, reasons } = scoreTurnRelevance(turn, intent, { newestTurnIndex });
      return {
        turn,
        priority:
          score >= RETRIEVAL_SCORE_THRESHOLD
            ? ContextPriority.P2_RETRIEVED
            : ContextPriority.P3_OPTIONAL,
        score,
        reasons,
      };
    });
  }

  /**
   * Places turns by priority, then by score, until the budget is spent.
   *
   * P0 is placed before the budget is consulted at all: a generation without
   * the prompt it is answering is not a degraded generation, it is a broken
   * one. Everything else is placed only if it fits whole — a turn is never
   * half-included.
   */
  private fitToBudget(
    scored: readonly ScoredTurn[],
    budget: ModelTokenBudget,
    warnings: string[],
  ): { kept: ScoredTurn[]; omittedTurns: ScoredTurn[]; spent: number } {
    const order: ContextPriority[] = [
      ContextPriority.P0_REQUIRED,
      ContextPriority.P1_RECENT,
      ContextPriority.P2_RETRIEVED,
      ContextPriority.P3_OPTIONAL,
    ];

    const kept: ScoredTurn[] = [];
    const omittedTurns: ScoredTurn[] = [];
    let spent = 0;

    for (const priority of order) {
      const bucket = scored
        .filter((entry) => entry.priority === priority)
        .sort((a, b) => b.score - a.score || b.turn.index - a.turn.index);

      for (const entry of bucket) {
        const cost = entry.turn.estimatedTokens;
        if (priority === ContextPriority.P0_REQUIRED) {
          kept.push(entry);
          spent += cost;
          continue;
        }
        // The floor exists so a small window still produces a conversation
        // rather than a single isolated question.
        const underFloor = kept.length < MIN_TURNS_FLOOR;
        if (spent + cost <= budget.availableInputTokens || underFloor) {
          kept.push(entry);
          spent += cost;
          continue;
        }
        omittedTurns.push(entry);
      }
    }

    if (spent > budget.availableInputTokens) {
      warnings.push(
        `INPUT_BUDGET_EXCEEDED_BY_FLOOR: spent ${String(spent)} of ${String(budget.availableInputTokens)} keeping the ${String(MIN_TURNS_FLOOR)}-turn floor`,
      );
    }
    if (omittedTurns.length > 0) {
      warnings.push(`TURNS_OMITTED: ${String(omittedTurns.length)}`);
    }

    kept.sort((a, b) => a.turn.index - b.turn.index);
    return { kept, omittedTurns, spent };
  }

  private describeOmissions(omittedTurns: readonly ScoredTurn[]): OmittedMessage[] {
    const out: OmittedMessage[] = [];
    for (const entry of omittedTurns) {
      const reason =
        entry.priority === ContextPriority.P3_OPTIONAL
          ? ContextOmissionReason.LOW_RELEVANCE
          : ContextOmissionReason.TOKEN_BUDGET_EXHAUSTED;
      for (const message of entry.turn.messages) {
        out.push({ messageId: message.id, role: message.role, reason, score: entry.score });
      }
    }
    return out;
  }

  private lastUserContent(messages: readonly ChatMessage[]): string {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message !== undefined && message.role === 'USER') {
        return message.content ?? '';
      }
    }
    return '';
  }

  private emptyManifest(
    totalThreadMessages: number,
    budget: ModelTokenBudget,
    referenceSignal: ConversationContextManifest['referenceSignal'],
    warnings: string[],
  ): ConversationContextManifest {
    return {
      totalThreadMessages,
      includedMessageIds: [],
      includedTurnCount: 0,
      omitted: [],
      estimatedInputTokens: 0,
      budget,
      referenceSignal,
      warnings,
    };
  }
}
