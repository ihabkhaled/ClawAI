import type { ContextSaveStatus, MemoryRecordType } from '../../../common/enums';
import type { SaveFailureReason, SaveToContextOutcome } from './save-to-context.types';

/** A pack the "which pack?" card offers. */
export type ContextSavePackOption = { id: string; name: string };

/** What the answer records about a chat save; the frontend card renders it. */
export type ContextSaveRecord = {
  status: ContextSaveStatus;
  memory?: {
    id: string;
    type: MemoryRecordType;
    preview: string;
    link: string;
  };
  memoryFailure?: SaveFailureReason;
  pack?: {
    id: string;
    name: string;
    created: boolean;
    link: string;
  };
  packFailure?: SaveFailureReason;
  /** Present only while the user still has to pick a pack. */
  pending?: {
    sourceMessageId: string;
    content: string;
    suggestedName: string;
    options: ContextSavePackOption[];
  };
};

/** The orchestrator's answer for one turn. */
export type ContextSaveDecision =
  | { kind: 'AI'; record: ContextSaveRecord; modelNote: string }
  | { kind: 'LEGACY'; outcome: SaveToContextOutcome };

export type ChatPackOptionResponse = { id: string; name: string; itemCount: number };

export type AddItemFromChatResponse = { packId?: string; itemId?: string; name?: string };
