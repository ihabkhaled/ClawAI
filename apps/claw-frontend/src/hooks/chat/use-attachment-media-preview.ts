import { useCallback } from 'react';

import { useAuthenticatedFileBlob } from '@/hooks/chat/use-authenticated-file-blob';
import { useTranslation } from '@/lib/i18n';
import type { UseAttachmentMediaPreviewReturn } from '@/types/attachment-preview.types';
import { triggerBrowserDownload } from '@/utilities/download-blob.utility';

/**
 * A voice/video note under a sent message: nothing downloads until the user
 * presses play, then the same authenticated blob feeds a native <audio>/
 * <video> element (built-in controls, duration, seek — no waveform library
 * needed for "playable").
 *
 * The player's own "Download" menu saves a blob URL, which has no name, so
 * the note landed on disk as "blob" with no extension. `download` saves it
 * under the stored filename instead.
 */
export function useAttachmentMediaPreview(
  fileId: string,
  filename: string,
  mimeType?: string,
): UseAttachmentMediaPreviewReturn {
  const { t } = useTranslation();
  const { blobUrl, isLoading, error, load } = useAuthenticatedFileBlob(
    `/api/v1/files/download/${fileId}`,
    false,
  );

  const download = useCallback((): void => {
    if (blobUrl !== null) {
      triggerBrowserDownload(blobUrl, filename, mimeType);
    }
  }, [blobUrl, filename, mimeType]);

  return {
    t,
    blobUrl,
    isLoading,
    error,
    hasStarted: isLoading || blobUrl !== null,
    play: load,
    download,
  };
}
