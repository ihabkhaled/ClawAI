import { MessageRole } from '@/enums';
import type { ChatMessage } from '@/types/chat.types';

/**
 * An answer that only promised a search, while the search and the real answer are still running (ADR-227). The page
 * keeps waiting for the next message instead of treating this one as the end of the turn.
 */
export function isPendingSearchPromise(message: ChatMessage | undefined): boolean {
  if (message?.role !== MessageRole.ASSISTANT) {
    return false;
  }
  const record = message.metadata?.['searchContinuation'];
  return (
    typeof record === 'object' && record !== null && Reflect.get(record, 'status') === 'pending'
  );
}
