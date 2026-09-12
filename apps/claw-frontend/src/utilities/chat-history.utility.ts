import { MessageRole } from '@/enums';
import type { ChatMessage } from '@/types';

/**
 * The content of the most recent message the USER sent in a thread, or
 * undefined when the thread has none yet.
 *
 * This is what ArrowUp recalls into an empty composer. It deliberately ignores
 * assistant/system/tool turns: "up" means "what I said last", the same contract
 * a shell history gives, not "the last thing on screen".
 *
 * The messages array is chronological (oldest first), so the LAST match is the
 * most recent one — `findLast`, not `find`.
 */
export function findLastUserMessageContent(messages: ChatMessage[]): string | undefined {
  const lastUserMessage = messages.findLast((message) => message.role === MessageRole.USER);
  if (lastUserMessage === undefined) {
    return undefined;
  }
  const content = lastUserMessage.content.trim();
  return content.length === 0 ? undefined : lastUserMessage.content;
}
