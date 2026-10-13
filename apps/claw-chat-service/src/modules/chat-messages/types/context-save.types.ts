import type { ContextSaveProposal } from '@claw/shared-types';
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
  /** The user message the save came from; confirm saves with it as the source. */
  sourceMessageId?: string;
  /** Present while status is PROPOSED: the pre-filled form the user confirms (ADR-168). */
  proposal?: ContextSaveProposal;
  /**
   * Stable error code of the last confirm that saved nothing or only half (one of
   * CONTEXT_SAVE_PROPOSAL_ERROR_CODES); the card is back to PROPOSED so the user can retry.
   * `memoryFailure` / `packFailure` name which half failed.
   */
  proposalError?: string;
  /** ISO time of the claim that moved the record to SAVING; an old one is abandoned (see CONTEXT_SAVE_SAVING_STALE_MS). */
  savingSince?: string;
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
