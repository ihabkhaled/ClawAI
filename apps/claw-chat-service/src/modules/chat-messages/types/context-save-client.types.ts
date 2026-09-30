import type { SaveFailureReason } from './save-to-context.types';

/** A memory-service call: the value, or why it failed (plan, limit, outage). */
export type ContextSaveCallResult<T> =
  { ok: true; value: T } | { ok: false; reason: SaveFailureReason };
