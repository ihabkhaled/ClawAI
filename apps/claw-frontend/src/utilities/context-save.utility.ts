import { ContextSaveStatus } from '@/enums';
import type { ContextSaveRecord } from '@/types';

/** The save record on an answer's metadata, or null (tolerant of odd JSON). */
export function contextSaveOfMessage(
  metadata: Record<string, unknown> | null | undefined,
): ContextSaveRecord | null {
  const record = metadata?.['contextSave'];
  if (typeof record !== 'object' || record === null) {
    return null;
  }
  const status = (record as { status?: unknown }).status;
  return typeof status === 'string' &&
    (Object.values(ContextSaveStatus) as string[]).includes(status)
    ? (record as ContextSaveRecord)
    : null;
}
