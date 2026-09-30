import { ARCHIVE_REJECTION_MESSAGE_KEYS } from '@/constants/archive.constants';
import {
  EXTRACTION_ERROR_GENERIC_KEY,
  EXTRACTION_ERROR_KEY_BY_VIDEO_REASON,
} from '@/constants/extraction-error.constants';
import { FileIngestionStatus } from '@/enums/file-ingestion-status.enum';
import type { ComposerAttachmentFileStatus } from '@/types/composer-attachment.types';
import { getArchiveRejection } from '@/utilities/archive-status.utility';

/**
 * The i18n key for why a file failed, read from its CODE — never its English
 * `extractionError` sentence. Video: `extractionMetadata.media.failureReason`.
 * Archive: the `ZIP_…:` / `ARCHIVE_…:` prefix. Anything else (including a
 * failure with no code at all): the generic localized detail.
 */
export function extractionErrorDetailKey(file: ComposerAttachmentFileStatus): string {
  const videoReason = file.extractionMetadata?.media?.failureReason ?? null;
  if (videoReason !== null) {
    const videoKey = EXTRACTION_ERROR_KEY_BY_VIDEO_REASON.get(videoReason);
    if (videoKey !== undefined) {
      return videoKey;
    }
  }
  const archive = getArchiveRejection(file.extractionError, FileIngestionStatus.FAILED);
  if (archive !== null) {
    return ARCHIVE_REJECTION_MESSAGE_KEYS[archive.reason];
  }
  return EXTRACTION_ERROR_GENERIC_KEY;
}
