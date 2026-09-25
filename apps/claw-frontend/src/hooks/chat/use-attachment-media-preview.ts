import { useCallback } from 'react';

import {
  VIDEO_DURATION_LABEL_KEY,
  VIDEO_THUMBNAIL_ALT_KEY,
} from '@/constants/video-thumbnail.constants';
import { useAuthenticatedFileBlob } from '@/hooks/chat/use-authenticated-file-blob';
import { useTranslation } from '@/lib/i18n';
import type { UseAttachmentMediaPreviewReturn } from '@/types/attachment-preview.types';
import type { VideoMediaSummary } from '@/types/file.types';
import { triggerBrowserDownload } from '@/utilities/download-blob.utility';
import { formatMediaClock } from '@/utilities/format-duration.utility';
import { readVideoDurationMs, toVideoPosterSrc } from '@/utilities/video-thumbnail.utility';

/**
 * A voice/video note under a sent message: nothing downloads until the user
 * presses play, then the same authenticated blob feeds a native <audio>/
 * <video> element (built-in controls, duration, seek — no waveform library
 * needed for "playable").
 *
 * A processed video also shows its stored thumbnail and length BEFORE play —
 * both already on the owner's file row (`extractionMetadata.media`), so no
 * extra request. No thumbnail (not processed yet, failed, audio) keeps the
 * plain play card.
 *
 * The player's own "Download" menu saves a blob URL, which has no name, so
 * the note landed on disk as "blob" with no extension. `download` saves it
 * under the stored filename instead.
 */
export function useAttachmentMediaPreview(
  fileId: string,
  filename: string,
  mimeType?: string,
  media?: VideoMediaSummary | null,
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

  const durationMs = readVideoDurationMs(media);

  return {
    t,
    blobUrl,
    isLoading,
    error,
    hasStarted: isLoading || blobUrl !== null,
    play: load,
    download,
    posterSrc: toVideoPosterSrc(media),
    durationLabel:
      durationMs === null
        ? null
        : t(VIDEO_DURATION_LABEL_KEY, { duration: formatMediaClock(durationMs) }),
    posterAlt: t(VIDEO_THUMBNAIL_ALT_KEY, { name: filename }),
  };
}
