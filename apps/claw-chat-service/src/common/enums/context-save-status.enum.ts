/**
 * Where a chat's "save this to memory / a context pack" request stands
 * (ADR-134). Stored on the answer as `metadata.contextSave.status`.
 */
export enum ContextSaveStatus {
  SAVED = 'SAVED',
  NEEDS_PACK_CHOICE = 'NEEDS_PACK_CHOICE',
  SAVING = 'SAVING',
  FAILED = 'FAILED',
  /** A save was proposed and waits for the user to confirm or dismiss it (ADR-168). */
  PROPOSED = 'PROPOSED',
  /** The user dismissed the proposal; nothing was saved. */
  DISMISSED = 'DISMISSED',
}
