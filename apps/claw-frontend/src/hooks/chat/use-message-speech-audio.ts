import { useCallback } from 'react';

import { useAuthenticatedFileBlob } from '@/hooks/chat/use-authenticated-file-blob';
import { useTranslation } from '@/lib/i18n';
import type { UseMessageSpeechAudioReturn } from '@/types/message-speech.types';
import { triggerBrowserDownload } from '@/utilities/download-blob.utility';
import { buildSpeechDownloadPath } from '@/utilities/message-speech.utility';

/**
 * The spoken reply's audio. It is an ordinary user-owned file, fetched through
 * the authenticated download path as soon as it exists, never a public URL.
 * Download saves it under the backend's filename, not as a nameless "blob".
 */
export function useMessageSpeechAudio(
  fileId: string,
  filename: string,
  mimeType: string,
): UseMessageSpeechAudioReturn {
  const { t } = useTranslation();
  const { blobUrl, isLoading, error } = useAuthenticatedFileBlob(
    buildSpeechDownloadPath(fileId),
    true,
  );

  const download = useCallback((): void => {
    if (blobUrl !== null) {
      triggerBrowserDownload(blobUrl, filename, mimeType);
    }
  }, [blobUrl, filename, mimeType]);

  return { t, blobUrl, isLoading, hasError: error !== null, download };
}
