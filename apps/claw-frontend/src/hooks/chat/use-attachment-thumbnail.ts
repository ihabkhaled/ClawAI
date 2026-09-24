import { useCallback, useState } from 'react';

import { useAuthenticatedFileBlob } from '@/hooks/chat/use-authenticated-file-blob';
import { useTranslation } from '@/lib/i18n';
import type { UseAttachmentThumbnailReturn } from '@/types/attachment-preview.types';

/**
 * An image attachment under a sent message. Two ways it can fail, and both
 * must end in a named file card rather than the browser's broken-image glyph:
 *
 * - the download itself fails — the file is past retention (404), the session
 *   expired (401), or the network dropped. The old hook swallowed a non-OK
 *   response and left the tile on its loading placeholder forever;
 * - the bytes arrive but cannot be decoded — HEIC on Chrome, an HTML error
 *   page served with 200, a truncated upload. Only the `<img>` element's
 *   `error` event can tell us that.
 */
export function useAttachmentThumbnail(fileId: string): UseAttachmentThumbnailReturn {
  const { t } = useTranslation();
  const { blobUrl, error } = useAuthenticatedFileBlob(`/api/v1/files/download/${fileId}`, true);
  const [hasDecodeError, setHasDecodeError] = useState(false);

  const handleImageError = useCallback((): void => {
    setHasDecodeError(true);
  }, []);

  return {
    t,
    blobUrl,
    isUnavailable: error !== null || hasDecodeError,
    handleImageError,
  };
}
