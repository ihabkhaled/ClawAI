import { useCallback, useState } from 'react';

import { useComposerAttachments } from '@/hooks/files/use-composer-attachments';
import type { UseOrchestrationComposerReturn } from '@/types/hook.types';

/**
 * Attachment state for an orchestration lab page.
 *
 * Compare has had attachments since it shipped; the other nine pages could not
 * express them at all — their backend DTOs had no `fileIds` field and their
 * pages had no picker. The result was that whether you could hand the model a
 * document depended on which lab you happened to open.
 *
 * This owns the selected list so a page does not have to, and pairs it with
 * `useComposerAttachments` so paste and drag-drop go through the same upload
 * pipeline — antivirus, magic-byte check, chunking — as the paperclip.
 *
 * `clear()` is called after a successful send, matching Compare: a lab run is
 * one question, and leaving the attachments selected silently re-sends them
 * with the next one.
 */
export function useOrchestrationComposer(disabled = false): UseOrchestrationComposerReturn {
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const { ingestFiles, isUploading, pendingCount } = useComposerAttachments({
    selectedFileIds,
    onChange: setSelectedFileIds,
    disabled,
  });

  const clear = useCallback((): void => {
    setSelectedFileIds([]);
  }, []);

  return {
    selectedFileIds,
    setSelectedFileIds,
    ingestFiles,
    isUploading,
    pendingCount,
    clear,
  };
}
