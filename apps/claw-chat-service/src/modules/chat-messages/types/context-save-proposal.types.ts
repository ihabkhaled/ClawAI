import type { ContextSaveRecord } from './context-save.types';
import type { SaveFailureReason } from './save-to-context.types';

/** What one confirm did: the record to store, and the first failure if any. */
export type ContextSaveConfirmOutcome = {
  record: ContextSaveRecord;
  failure?: SaveFailureReason;
  /** Neither the memory nor the pack went through (a total failure). */
  nothingSaved: boolean;
};

/** One half of a confirm (memory or pack): done, or why it was not. */
export type ContextSavePartOutcome = { done: boolean; failure?: SaveFailureReason };
