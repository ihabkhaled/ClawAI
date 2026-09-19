import { useCallback, useEffect, useState } from 'react';

import { FILE_EXPIRY_TICK_MS } from '@/constants/file-generation.constants';
import { useFileDownload } from '@/hooks/chat/use-file-download';
import { useFileGenerationListener } from '@/hooks/chat/use-file-generation-listener';
import { fileGenerationRepository } from '@/repositories/file-generation/file-generation.repository';
import type { UseFileGenerationBubbleResult } from '@/types/file-generation.types';
import {
  fileAssetMinutesLeft,
  isFileAssetExpired,
  latestFileAsset,
} from '@/utilities/file-asset.utility';

/**
 * Everything a generated file in the chat needs: its latest asset, whether
 * its hour is up, a live minutes-left count, download on click, and a free
 * rebuild that re-subscribes to the job so the new file appears in place.
 */
export function useFileGenerationBubble(generationId: string): UseFileGenerationBubbleResult {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const generation = useFileGenerationListener(generationId, refreshKey);
  const downloader = useFileDownload();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), FILE_EXPIRY_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const asset = latestFileAsset(generation?.assets);
  const expired = asset !== undefined && isFileAssetExpired(asset, now);
  const minutesLeft = asset === undefined || expired ? null : fileAssetMinutesLeft(asset, now);

  const download = useCallback((): void => {
    if (asset !== undefined && generation !== null) {
      void downloader.download(asset.downloadUrl, generation.filename ?? 'download');
    }
  }, [asset, generation, downloader]);

  const rebuild = useCallback((): void => {
    setIsRebuilding(true);
    void fileGenerationRepository
      .rebuild(generationId)
      .then(() => setRefreshKey((key) => key + 1))
      .finally(() => setIsRebuilding(false));
  }, [generationId]);

  return {
    generation,
    asset,
    expired,
    minutesLeft,
    isRebuilding,
    isDownloading: downloader.isDownloading,
    downloadFailed: downloader.failed,
    download,
    rebuild,
  };
}
