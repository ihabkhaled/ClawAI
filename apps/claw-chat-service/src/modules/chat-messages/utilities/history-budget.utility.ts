import type { ChatMessage } from '../../../generated/prisma';
import { HISTORY_MIN_MESSAGE_CHARS } from '../constants/evidence-fit.constants';
import { APPROX_CHARS_PER_TOKEN } from '../../../common/constants/execution.constants';

/**
 * Shortens messages so their total fits a token budget.
 *
 * Only used when the turn floor already overspent: the selection is kept (a
 * short conversation beats an isolated question), and every message but the
 * newest is cut evenly. The newest message is the question being answered; it
 * gets whatever the others leave, and at least HISTORY_MIN_MESSAGE_CHARS.
 */
export function shortenToBudget(messages: ChatMessage[], budgetTokens: number): ChatMessage[] {
  const budgetChars = Math.max(0, budgetTokens) * APPROX_CHARS_PER_TOKEN;
  const total = messages.reduce((sum, message) => sum + message.content.length, 0);
  if (total <= budgetChars || messages.length === 0) {
    return messages;
  }
  const newest = messages.at(-1);
  if (newest === undefined) {
    return messages;
  }
  const older = messages.slice(0, -1);
  const newestChars = Math.max(
    HISTORY_MIN_MESSAGE_CHARS,
    Math.min(newest.content.length, Math.floor(budgetChars / 2)),
  );
  const perOlder =
    older.length === 0
      ? 0
      : Math.max(HISTORY_MIN_MESSAGE_CHARS, Math.floor((budgetChars - newestChars) / older.length));
  return [...older.map((message) => cut(message, perOlder)), cut(newest, newestChars)];
}

function cut(message: ChatMessage, maxChars: number): ChatMessage {
  return message.content.length <= maxChars
    ? message
    : {
        ...message,
        content: `${message.content.slice(0, maxChars)}\n[...shortened to fit the model's context window...]`,
      };
}
