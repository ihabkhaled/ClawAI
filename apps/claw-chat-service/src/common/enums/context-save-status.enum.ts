/**
 * Where a chat's "save this to memory / a context pack" request stands
 * (ADR-134). Stored on the answer as `metadata.contextSave.status`.
 */
export enum ContextSaveStatus {
  SAVED = 'SAVED',
  NEEDS_PACK_CHOICE = 'NEEDS_PACK_CHOICE',
  SAVING = 'SAVING',
  FAILED = 'FAILED',
}
