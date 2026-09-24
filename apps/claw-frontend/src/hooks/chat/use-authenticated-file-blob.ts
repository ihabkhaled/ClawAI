import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import type { UseAuthenticatedFileBlobReturn } from '@/types/attachment-preview.types';
import { getAccessToken, logger } from '@/utilities';

/**
 * Authenticated fetch-to-blob-URL for one file, shared by every non-image
 * attachment preview (audio/video players, the PDF/text/generic file card).
 * `autoLoad` fetches on mount, like an image thumbnail; otherwise nothing is
 * downloaded until `load()` is called — a voice note is small enough to fetch
 * eagerly, but a video or a 50MB archive member is not, so those wait for the
 * user to press play/download.
 */
export function useAuthenticatedFileBlob(
  path: string,
  autoLoad: boolean,
): UseAuthenticatedFileBlobReturn {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const previousUrlRef = useRef<string | null>(null);
  const hasStartedRef = useRef(false);

  const load = useCallback((): void => {
    if (hasStartedRef.current || path.length === 0) {
      return;
    }
    hasStartedRef.current = true;
    setIsLoading(true);
    setError(null);

    const url = path.startsWith('/api/') ? `${API_BASE_URL.replace('/api/v1', '')}${path}` : path;
    const token = getAccessToken();

    void fetch(url, { headers: { Authorization: `Bearer ${token ?? ''}` } })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Attachment download failed (${String(response.status)})`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (previousUrlRef.current) {
          URL.revokeObjectURL(previousUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(blob);
        previousUrlRef.current = objectUrl;
        setBlobUrl(objectUrl);
      })
      .catch((fetchError: unknown) => {
        hasStartedRef.current = false;
        const normalized =
          fetchError instanceof Error ? fetchError : new Error('Attachment download failed');
        setError(normalized);
        logger.warn({
          component: 'chat',
          action: 'authenticated-file-blob-error',
          message: normalized.message,
          details: { path },
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [path]);

  useEffect(() => {
    if (autoLoad) {
      load();
    }
    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
        previousUrlRef.current = null;
      }
    };
  }, [autoLoad, load]);

  return { blobUrl, isLoading, error, load };
}
