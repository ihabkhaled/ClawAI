import type { ChatMessage } from '@/types';

/**
 * The chain of thought stored with an assistant message, if any.
 *
 * Reasoning used to exist only in the live stream: visible while the answer was
 * generating, gone the moment the page was refreshed. It is now persisted onto
 * the message, so a thread reopened the next day still shows how the answer was
 * reached.
 *
 * Returns null rather than an empty string for "none", so a caller can branch on
 * presence without also having to think about whitespace.
 */
export function getStoredReasoning(message: ChatMessage): string | null {
  const stored = message.metadata?.['reasoning'];
  if (typeof stored !== 'string') {
    return null;
  }
  const trimmed = stored.trim();
  return trimmed.length > 0 ? trimmed : null;
}
