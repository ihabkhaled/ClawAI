import type { TurnIntentKind, TurnIntentPayload } from '@claw/shared-types';

/**
 * What the previous assistant turn in the thread produced. Sent by
 * chat-service on `message.created` as `previousTurnKind` (ADR-218), so
 * "regenerate" / "again" can re-do the previous turn's kind.
 */
export type PreviousTurnKind = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';

/** What a MANUAL pick can produce: a chat model answers in text, the rest generate. */
export type PickedModelKind = 'CHAT' | 'IMAGE' | 'VIDEO' | 'FILE';

/** The validated answer of the turn-intent classifier. */
export interface TurnIntentAnswer {
  intent: TurnIntentKind;
  fileFormat: string | null;
  confidence: number;
}

/** What the classifier is told about one turn. */
export interface TurnIntentRequest {
  message: string;
  /** Whose PAYG wallet pays for the classifier call. Absent = unmetered. */
  userId?: string;
  threadId?: string;
  previousTurnKind?: PreviousTurnKind;
  attachmentMimeTypes?: readonly string[];
  /** MANUAL only: what the picked model can produce. */
  pickedModelKind?: PickedModelKind;
}

export interface TurnIntentCacheEntry {
  answer: TurnIntentAnswer | null;
  expiresAt: number;
}

/**
 * One request's turn intent, written while routing and read by
 * `RoutingManager.evaluateRoute` to put `turnIntent` on the decision.
 * `classified` makes the classifier run at most once per request even when
 * two routing steps ask (AUTO gate, then the heuristic path).
 */
export interface TurnIntentSlot {
  classified?: boolean;
  answer?: TurnIntentAnswer | null;
  payload?: TurnIntentPayload;
}
