/** Mirrors chat-service's ContextSaveStatus (ADR-133). */
export enum ContextSaveStatus {
  SAVED = 'SAVED',
  NEEDS_PACK_CHOICE = 'NEEDS_PACK_CHOICE',
  SAVING = 'SAVING',
  FAILED = 'FAILED',
}
