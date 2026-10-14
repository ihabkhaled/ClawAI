import { type ChatMessage, MessageRole } from '../../../generated/prisma';

/**
 * The nearest USER row before `messageId` in a thread. `recentNewestFirst` is
 * the repository's newest-first window. When the message is not in the window
 * the whole window is searched. Returns undefined when no user row qualifies.
 *
 * A reverse scan rather than `findLast`, which this service's lib target does
 * not provide.
 */
export function findPrecedingUserMessage(
  recentNewestFirst: readonly ChatMessage[],
  messageId: string,
): ChatMessage | undefined {
  const chronological = [...recentNewestFirst].reverse();
  const index = chronological.findIndex((row) => row.id === messageId);
  const searchWindow = index < 0 ? chronological : chronological.slice(0, index);
  for (let cursor = searchWindow.length - 1; cursor >= 0; cursor -= 1) {
    const row = searchWindow.at(cursor);
    if (row?.role === MessageRole.USER) {
      return row;
    }
  }
  return undefined;
}
