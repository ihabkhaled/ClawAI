import { useQuery } from '@tanstack/react-query';

import { ATTACHMENT_FILE_META_STALE_MS } from '@/constants/attachment-preview.constants';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAttachmentFileMetaReturn } from '@/types/attachment-preview.types';

/**
 * The mimeType + filename of one attachment under a sent message — what
 * decides whether it renders as an image, a player, or a file card. Cached
 * hard: an uploaded file's own metadata never changes.
 *
 * No retry: a 404 (deleted, or not the caller's) is an answer, and the caller
 * falls back to a generic attachment card rather than spinning forever.
 */
export function useAttachmentFileMeta(fileId: string): UseAttachmentFileMetaReturn {
  const query = useQuery({
    queryKey: queryKeys.files.detail(fileId),
    queryFn: () => filesRepository.getFile(fileId),
    enabled: fileId.length > 0,
    staleTime: ATTACHMENT_FILE_META_STALE_MS,
    retry: false,
  });

  return { file: query.data, isLoading: query.isLoading, isError: query.isError };
}
