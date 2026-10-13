import { Mic, Video } from 'lucide-react';

import { INGESTION_STATUS_LABELS } from '@/constants';
import { FileIngestionStatus } from '@/enums';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { UseFileLibraryRowReturn } from '@/types/file-library-ui.types';
import type { UploadedFile } from '@/types/file.types';
import { getArchiveFileCount, isArchiveFile } from '@/utilities/archive-status.utility';
import { formatLibraryDate } from '@/utilities/file-library.utility';
import {
  getIngestionStatusIcon,
  isAudioMime,
  isVideoMime,
} from '@/utilities/file-type-icon.utility';
import { formatFileSize } from '@/utilities/format.utility';
import { getHtmlLanguage } from '@/utilities/locale.utility';

/**
 * What a library row says about its file: "1.2 MB · Oct 5", plus a status word
 * only while the file is not ready (a ready file needs no badge — calm).
 *
 * A recorded clip reads as something the user SPOKE ("Voice note" / "Video
 * note"), not a document they attached, and an archive says it attaches whole
 * ("Attach whole · 12 files") — what the old paperclip rows said.
 */
export function useFileLibraryRow(file: UploadedFile): UseFileLibraryRowReturn {
  const { t, locale } = useTranslation();
  const date = formatLibraryDate(file.createdAt, getHtmlLanguage(locale));
  const isArchive = isArchiveFile(file);
  const fileCount = getArchiveFileCount(file);

  let KindIcon: UseFileLibraryRowReturn['KindIcon'] = null;
  let kindLabel: string | null = null;
  if (isAudioMime(file.mimeType)) {
    KindIcon = Mic;
    kindLabel = t('chat.attachment.voiceNote');
  } else if (isVideoMime(file.mimeType)) {
    KindIcon = Video;
    kindLabel = t('chat.attachment.videoNote');
  } else if (isArchive) {
    kindLabel = [
      t('files.archive.attachWhole'),
      fileCount > 0 ? t('files.archive.fileCount', { count: fileCount }) : '',
    ]
      .filter((part) => part.length > 0)
      .join(' · ');
  }

  const metaLine = [kindLabel ?? '', formatFileSize(file.sizeBytes), date]
    .filter((part) => part.length > 0)
    .join(' · ');

  const isReady = file.ingestionStatus === FileIngestionStatus.COMPLETED;
  const statusKey = INGESTION_STATUS_LABELS[file.ingestionStatus];
  const statusText = statusKey === undefined ? file.ingestionStatus : t(statusKey);
  const status = getIngestionStatusIcon(file.ingestionStatus);

  return {
    t,
    isArchive,
    metaLine,
    KindIcon,
    statusLabel: isReady ? null : statusText,
    StatusIcon: isReady ? null : status.Icon,
    statusSpin: status.spin,
    showBrowseArchive: isArchive && (file.childCount ?? 0) > 0,
  };
}
