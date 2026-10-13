import { useCallback, useEffect, useState } from 'react';

import { FILE_LIBRARY_LOCAL_PREVIEW_MAX_BYTES } from '@/constants/file-library.constants';
import type { UseFilePreviewUrlReturn } from '@/types/file-library-ui.types';

/**
 * A local preview URL for a file the user just picked, before the server has
 * it. The object URL is created when the file arrives and revoked when the
 * file changes or the tile unmounts, so a tray of photos does not hold their
 * bytes in memory after they are sent or cancelled.
 *
 * No URL is made for an image past the decode cap, and one the browser cannot
 * decode (HEIC on most browsers) is dropped through `handleError`; either way
 * `showFallbackIcon` is true so the tile draws its type icon instead.
 */
export function useFilePreviewUrl(file: File | undefined): UseFilePreviewUrlReturn {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const isImage = file !== undefined && file.type.startsWith('image/');
  const isTooBig = file !== undefined && file.size > FILE_LIBRARY_LOCAL_PREVIEW_MAX_BYTES;

  useEffect(() => {
    setHasError(false);
    if (file === undefined || !isImage || isTooBig) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, isImage, isTooBig]);

  const handleError = useCallback((): void => setHasError(true), []);

  return {
    previewUrl: hasError ? null : previewUrl,
    showFallbackIcon: isImage && (isTooBig || hasError),
    handleError,
  };
}
