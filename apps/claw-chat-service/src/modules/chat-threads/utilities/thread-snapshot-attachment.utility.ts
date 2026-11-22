import type { FileContentResponse } from '../../chat-messages/types/context.types';

/** A user turn's attached file ids, de-duplicated; other roles' files never travel. */
export function snapshotFileIdsOf(message: { role: string; metadata: unknown }): string[] {
  if (message.role !== 'USER') return [];
  const metadata = message.metadata as Record<string, unknown> | null;
  const fileIds = metadata?.['fileIds'];
  return Array.isArray(fileIds)
    ? [...new Set(fileIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : [];
}

/**
 * The derived text only (document, OCR, transcript), and only once extraction finished: `content`
 * is the original bytes and never becomes prompt text (rule 42 §1, §5).
 */
export function snapshotTextOf(file: FileContentResponse): string | null {
  const finished = file.ingestionStatus === undefined || file.ingestionStatus === 'COMPLETED';
  return finished && typeof file.extractedText === 'string' ? file.extractedText : null;
}
