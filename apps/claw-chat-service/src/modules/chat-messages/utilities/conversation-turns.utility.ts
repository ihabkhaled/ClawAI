import { type ChatMessage } from '../../../generated/prisma';
import { ROLE_ENVELOPE_TOKENS } from '../constants/context-composer.constants';
import { type ConversationTurn } from '../types/context-composer.types';
import { estimateTokensFromText } from './token-estimator.utility';

/**
 * Groups a chronological message list into turns.
 *
 * A turn opens at a USER message and absorbs every ASSISTANT, TOOL and SYSTEM
 * message until the next USER message. Messages that precede the first USER
 * message form turn 0 with a null `userMessage`, so nothing is ever silently
 * dropped on the way in.
 *
 * Grouping exists so selection can never emit half a turn. The previous
 * `slice(-N)` cut at a message boundary, which meant that roughly half the
 * time the model received an assistant answer whose question had been removed.
 */
export function groupIntoTurns(messages: readonly ChatMessage[]): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  let current: ConversationTurn | null = null;

  for (const message of messages) {
    if (message.role === 'USER' || current === null) {
      current = {
        index: turns.length,
        userMessage: message.role === 'USER' ? message : null,
        responses: message.role === 'USER' ? [] : [message],
        messages: [message],
        estimatedTokens: estimateMessageTokens(message),
      };
      turns.push(current);
      continue;
    }
    current.responses.push(message);
    current.messages.push(message);
    current.estimatedTokens += estimateMessageTokens(message);
  }

  return turns;
}

/**
 * Token cost of one message as it will appear in the provider payload.
 *
 * The role prefix and the message separator are real tokens; counting only the
 * body under-reports by 3-5 tokens per message, which across a hundred-message
 * thread is an entire turn's worth of budget the composer thought it had.
 */
export function estimateMessageTokens(message: ChatMessage): number {
  return estimateTokensFromText(message.content ?? '') + ROLE_ENVELOPE_TOKENS;
}

/** Every message in the given turns, chronological, deduplicated by id. */
export function flattenTurns(turns: readonly ConversationTurn[]): ChatMessage[] {
  const seen = new Set<string>();
  const out: ChatMessage[] = [];
  for (const turn of [...turns].sort((a, b) => a.index - b.index)) {
    for (const message of turn.messages) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      out.push(message);
    }
  }
  return out;
}
