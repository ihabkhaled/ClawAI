import { useAuthenticatedFileBlob } from '@/hooks/chat/use-authenticated-file-blob';
import { useTranslation } from '@/lib/i18n';
import type { UseAttachmentMediaPreviewReturn } from '@/types/attachment-preview.types';

/**
 * A voice/video note under a sent message: nothing downloads until the user
 * presses play, then the same authenticated blob feeds a native <audio>/
 * <video> element (built-in controls, duration, seek — no waveform library
 * needed for "playable").
 */
export function useAttachmentMediaPreview(fileId: string): UseAttachmentMediaPreviewReturn {
  const { t } = useTranslation();
  const { blobUrl, isLoading, error, load } = useAuthenticatedFileBlob(
    `/api/v1/files/download/${fileId}`,
    false,
  );

  return {
    t,
    blobUrl,
    isLoading,
    error,
    hasStarted: isLoading || blobUrl !== null,
    play: load,
  };
}
