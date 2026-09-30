import { useEffect, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import type { UseAuthenticatedVideoReturn } from '@/types';
import { getAccessToken, logger, resolveImageUrl } from '@/utilities';

/**
 * Fetches an authenticated video file with the Bearer token into a blob URL a
 * `<video>` can play. The URL is revoked on unmount / path change, and a fetch
 * that resolves after that never leaks an object URL.
 */
export function useAuthenticatedVideo(path: string | undefined): UseAuthenticatedVideoReturn {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!path) {
      return;
    }
    let disposed = false;
    let objectUrl: string | null = null;
    setFailed(false);

    void fetch(resolveImageUrl(path, API_BASE_URL), {
      headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`video fetch ${String(response.status)}`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (disposed) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        logger.warn({
          component: 'chat',
          action: 'authenticated-video-error',
          message: 'Failed to fetch authenticated video',
          details: { path },
        });
        if (!disposed) {
          setFailed(true);
        }
      });

    return () => {
      disposed = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setBlobUrl(null);
    };
  }, [path]);

  return { blobUrl, failed };
}
