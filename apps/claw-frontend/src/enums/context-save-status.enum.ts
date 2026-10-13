/** Mirrors chat-service's ContextSaveStatus (ADR-134, ADR-168). */
export enum ContextSaveStatus {
  SAVED = 'SAVED',
  NEEDS_PACK_CHOICE = 'NEEDS_PACK_CHOICE',
  SAVING = 'SAVING',
  FAILED = 'FAILED',
  /** A model decided this was a save request; the user has not confirmed it yet (ADR-168). */
  PROPOSED = 'PROPOSED',
  /** The user chose "Not now"; nothing was saved (ADR-168). */
  DISMISSED = 'DISMISSED',
}
