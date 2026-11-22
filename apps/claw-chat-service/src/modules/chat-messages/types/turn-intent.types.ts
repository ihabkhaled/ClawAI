/** What the latest assistant answer in the thread was; routing reads it as `previousTurnKind` (ADR-218). */
export type PreviousTurnKind = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';

/** A stored row as the previous-turn reading needs it. */
export type TurnRow = { role: string; metadata?: unknown };

/** The user turn whose previous answer is read (a new, regenerated or edited turn). */
export type PreviousTurnAnchor = { id: string; threadId: string; createdAt: Date };
