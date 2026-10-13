import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { FILE_LIBRARY_THUMB_CACHE_MS } from '@/constants/file-library.constants';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseFileThumbnailBlobReturn } from '@/types/file-library-ui.types';

/**
 * A file's bytes as an object URL, fetched once per file id: the Blob lives in
 * the query cache, so a row that unmounts and mounts again (menu reopened,
 * list scrolled) does not download it twice. Each mounted row makes its own
 * object URL from the cached Blob and revokes it on unmount.
 */
export function useFileThumbnailBlob(fileId: string, enabled: boolean): UseFileThumbnailBlobReturn {
  const { data, isError } = useQuery({
    queryKey: queryKeys.files.thumbnail(fileId),
    queryFn: () => filesRepository.downloadBlob(fileId),
    enabled,
    staleTime: Infinity,
    gcTime: FILE_LIBRARY_THUMB_CACHE_MS,
    retry: false,
  });
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (data === undefined) {
      setBlobUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(data);
    setBlobUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [data]);

  return { blobUrl, isError };
}
