import { useCallback, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import type { UseFileDownloadResult } from '@/types/file-generation.types';
import { getAccessToken, logger } from '@/utilities';

/**
 * Downloads a generated file on click, with the session, as a real file.
 *
 * On click rather than eagerly: an eager fetch of an expired file failed
 * silently and left "Preparing download..." on screen forever. The path is
 * the asset proxy (`/api/v1/file-generations/.../download`); it names no
 * storage id and answers only the owner.
 */
export function useFileDownload(): UseFileDownloadResult {
  const [isDownloading, setIsDownloading] = useState(false);
  const [failed, setFailed] = useState(false);

  const download = useCallback(async (path: string, filename: string): Promise<void> => {
    setIsDownloading(true);
    setFailed(false);
    try {
      const url = path.startsWith('/api/') ? `${API_BASE_URL.replace('/api/v1', '')}${path}` : path;
      const token = getAccessToken();
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token ?? ''}` } });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    } catch {
      logger.warn({
        component: 'chat',
        action: 'file-download-error',
        message: 'File download failed',
      });
      setFailed(true);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return { download, isDownloading, failed };
}
