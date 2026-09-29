import type { SaveIntentTarget } from './save-intent-target.enum';

/** Memory types a chat save may pick; mirrors memory-service's MemoryType. */
export type SaveIntentMemoryType = 'FACT' | 'PREFERENCE' | 'INSTRUCTION' | 'SUMMARY';

export type SaveToContextIntent = {
  target: SaveIntentTarget;
  /** Only meaningful for MEMORY; FACT unless the wording says otherwise. */
  memoryType: SaveIntentMemoryType;
  /**
   * What follows the command in the same message, trimmed. Empty when the
   * command stands alone ("save this as memory") — the caller then saves the
   * previous message, or asks which one.
   */
  content: string;
};
