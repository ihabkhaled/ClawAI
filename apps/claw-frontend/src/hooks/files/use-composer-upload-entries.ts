import { useCallback, useRef, useState } from 'react';

import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import type {
  ComposerUploadEntry,
  ComposerUploadEntryPatch,
  UseComposerUploadEntriesReturn,
} from '@/types/composer-attachment.types';

/**
 * The composer's per-file upload ledger. `useComposerAttachments` used to keep
 * only a pending COUNT, so nothing could say which file was uploading, which
 * had failed, or why. Each ingested file gets an entry here; the chip strip
 * joins these with the selected ids and the file list's ingestion status.
 */
export function useComposerUploadEntries(): UseComposerUploadEntriesReturn {
  const [entries, setEntries] = useState<ComposerUploadEntry[]>([]);
  const nextIdRef = useRef(0);

  const begin = useCallback((filename: string): string => {
    nextIdRef.current += 1;
    const localId = `upload-${String(nextIdRef.current)}`;
    setEntries((current) => [
      ...current,
      { localId, filename, state: ComposerAttachmentState.Uploading, fileId: null, reason: null },
    ]);
    return localId;
  }, []);

  const settle = useCallback((localId: string, patch: ComposerUploadEntryPatch): void => {
    setEntries((current) =>
      current.map((entry) => (entry.localId === localId ? { ...entry, ...patch } : entry)),
    );
  }, []);

  const dismiss = useCallback((localId: string): void => {
    setEntries((current) => current.filter((entry) => entry.localId !== localId));
  }, []);

  return { entries, begin, settle, dismiss };
}
