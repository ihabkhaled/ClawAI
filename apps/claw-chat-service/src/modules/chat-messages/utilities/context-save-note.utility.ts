import type { ChatMessage } from '../../../generated/prisma';
import { CONTEXT_SAVE_TURN_MARKER } from '../constants/save-intent.constants';
import type { AssembledContext } from '../types/context.types';

/**
 * The context the answering model gets on a save turn: the assembled context
 * plus the platform's note about what was saved (ADR-134).
 *
 * The note goes in the system prompt AND, through `saveTurnNote`, on the final
 * user turn. The system prompt alone lost to a small model's prior — it said
 * "added to your context" while the pack choice was still pending — so the
 * note is repeated where the model looks most (rule 41). `threadMessages` is
 * left alone: routing and search decisions read the user's own words.
 */
export function withContextSaveNote(context: AssembledContext, note: string): AssembledContext {
  const systemPrompt =
    context.systemPrompt === null || context.systemPrompt.trim().length === 0
      ? note
      : `${context.systemPrompt}\n\n${note}`;
  return { ...context, systemPrompt, saveTurnNote: note };
}

/** The final user turn with the save note after it; unchanged when there is none. */
export function withSaveTurnNote(turnText: string, note: string | undefined): string {
  return note === undefined || note.length === 0 || turnText.includes(CONTEXT_SAVE_TURN_MARKER)
    ? turnText
    : `${turnText}\n\n${CONTEXT_SAVE_TURN_MARKER}\n${note}`;
}

/** Whether an answer carries a chat-save record (it was a save turn). */
export function hasContextSave(message: Pick<ChatMessage, 'metadata'>): boolean {
  const metadata = message.metadata;
  return typeof metadata === 'object' && metadata !== null && 'contextSave' in metadata;
}
