import { ContextSaveStatus } from '../../../common/enums';
import type { ChatMessage } from '../../../generated/prisma';
import { CONTEXT_SAVE_SAVING_STALE_MS } from '../constants/save-intent.constants';
import type { ContextSaveRecord } from '../types/context-save.types';

/**
 * The chat-save record an answer carries, or undefined when it is not a save
 * turn. The ONE reader of `metadata.contextSave`: every caller that needs the
 * record goes through here, so a status rule (below) cannot be missed in one.
 */
export function contextSaveOf(
  message: Pick<ChatMessage, 'metadata'>,
): ContextSaveRecord | undefined {
  const metadata = message.metadata;
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    return undefined;
  }
  const record = (metadata as Record<string, unknown>)['contextSave'];
  if (typeof record !== 'object' || record === null || Array.isArray(record)) return undefined;
  return typeof (record as { status?: unknown }).status === 'string'
    ? (record as ContextSaveRecord)
    : undefined;
}

/**
 * SAVED, DISMISSED and FAILED are final: nothing may confirm, choose or claim
 * them again. (A dismissed proposal is as settled as a saved one.)
 */
export function isContextSaveSettled(record: Pick<ContextSaveRecord, 'status'>): boolean {
  return (
    record.status === ContextSaveStatus.SAVED ||
    record.status === ContextSaveStatus.DISMISSED ||
    record.status === ContextSaveStatus.FAILED
  );
}

/**
 * A SAVING record whose claim is older than CONTEXT_SAVE_SAVING_STALE_MS (or
 * carries an unreadable claim time) was abandoned by a process that died after
 * claiming it; it counts as waiting again. One with NO claim time is never
 * taken over: the takeover is a compare-and-swap on that time, so without it
 * two tabs could both win. It is refused as not pending.
 */
export function isSavingAbandoned(
  record: Pick<ContextSaveRecord, 'status' | 'savingSince'>,
  now: number = Date.now(),
): boolean {
  if (record.status !== ContextSaveStatus.SAVING) return false;
  if (record.savingSince === undefined) return false;
  const since = Date.parse(record.savingSince);
  return Number.isNaN(since) || now - since > CONTEXT_SAVE_SAVING_STALE_MS;
}
