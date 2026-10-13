/**
 * "Remember this" proposals (ADR-168, extends ADR-134). When a model decides a chat
 * message is a request to save to memory and/or a context pack, the default is to
 * PROPOSE the save: the user sees a pre-filled form, edits the type, text and pack,
 * and confirms before anything is written.
 */

/** ASK proposes first (default); AUTO saves immediately like ADR-134 did. */
export type ContextSaveMode = 'ASK' | 'AUTO';

export type ContextSaveMemoryType = 'FACT' | 'PREFERENCE' | 'INSTRUCTION' | 'SUMMARY';

export type ContextSavePackSource = 'USER_TEXT' | 'PREVIOUS_MESSAGE' | 'SUMMARY';

export type ContextSaveProposalPackOption = { id: string; name: string; itemCount: number };

export type ContextSaveProposal = {
  /** Null when the model proposed no memory entry. */
  memory: { type: ContextSaveMemoryType; text: string } | null;
  /** Null when the model proposed no pack item. */
  pack: {
    source: ContextSavePackSource;
    content: string;
    /** The pack the user named, matched to an existing one; null when not named or new. */
    packId: string | null;
    packName: string | null;
    newPackName: string | null;
  } | null;
  options: ContextSaveProposalPackOption[];
};

/** The owner's confirmed (possibly edited) save. At least one of memory or pack is set. */
export type ContextSaveProposalConfirmRequest = {
  memory: { type: ContextSaveMemoryType; text: string } | null;
  pack: { packId: string | null; newPackName: string | null; content: string } | null;
};
