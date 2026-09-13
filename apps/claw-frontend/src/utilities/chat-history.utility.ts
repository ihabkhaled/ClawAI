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

/**
 * Every message the USER sent in a thread, most recent FIRST.
 *
 * The order is reversed from the thread on purpose: ArrowUp walks backwards in
 * time, so index 0 is "one press up" and the array reads in the order the keys
 * visit it. A caller indexing this never has to think about the thread's own
 * chronology.
 *
 * Assistant, system and tool turns are ignored — "up" means "what I said", the
 * same contract a shell history gives, not "the last thing on screen".
 *
 * Consecutive duplicates collapse. Sending the same prompt three times to
 * compare answers is ordinary, and it should cost one press to get past, not
 * three.
 */
export function collectUserMessageHistory(messages: ChatMessage[]): string[] {
  const history: string[] = [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message === undefined || message.role !== MessageRole.USER) {
      continue;
    }
    if (message.content.trim().length === 0) {
      continue;
    }
    if (history.at(-1) === message.content) {
      continue;
    }
    history.push(message.content);
  }
  return history;
}
