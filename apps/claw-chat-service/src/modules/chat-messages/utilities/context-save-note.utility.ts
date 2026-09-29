import type { ChatMessage } from '../../../generated/prisma';
import type { AssembledContext } from '../types/context.types';

/**
 * The context the answering model gets on a save turn: the assembled context
 * plus the platform's note about what was saved (ADR-133), appended to the
 * system prompt so every builder carries it.
 */
export function withContextSaveNote(context: AssembledContext, note: string): AssembledContext {
  const systemPrompt =
    context.systemPrompt === null || context.systemPrompt.trim().length === 0
      ? note
      : `${context.systemPrompt}\n\n${note}`;
  return { ...context, systemPrompt };
}

/** Whether an answer carries a chat-save record (it was a save turn). */
export function hasContextSave(message: Pick<ChatMessage, 'metadata'>): boolean {
  const metadata = message.metadata;
  return typeof metadata === 'object' && metadata !== null && 'contextSave' in metadata;
}
