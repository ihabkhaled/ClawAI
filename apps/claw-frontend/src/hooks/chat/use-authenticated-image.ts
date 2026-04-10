import { useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import { getAccessToken, logger } from '@/utilities';

export function useAuthenticatedImage(path: string | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const previousUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!path) {
      return;
    }

    const url = path.startsWith('/api/') ? `${API_BASE_URL.replace('/api/v1', '')}${path}` : path;

    const token = getAccessToken();

    void fetch(url, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    })
      .then((response) => {
        if (!response.ok) {
          return;
        }
        return response.blob();
      })
      .then((blob) => {
        if (!blob) {
          return;
        }
        if (previousUrlRef.current) {
          URL.revokeObjectURL(previousUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(blob);
        previousUrlRef.current = objectUrl;
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        logger.warn({ component: 'chat', action: 'authenticated-image-error', message: 'Failed to fetch authenticated image', details: { path } });
      });

    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
        previousUrlRef.current = null;
      }
    };
  }, [path]);

  return blobUrl;
}
