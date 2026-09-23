import { INGESTION_STATUS_COLORS, INGESTION_STATUS_LABELS } from '@/constants';
import { useToggle } from '@/hooks/common/use-toggle';
import { useTranslation } from '@/lib/i18n';
import type { UseFileListItemReturn } from '@/types/archive.types';
import type { UploadedFile } from '@/types/file.types';
import { getFileTypeDescriptor } from '@/utilities';
import {
  getArchiveFileCount,
  getArchiveRejection,
  isArchiveFile,
} from '@/utilities/archive-status.utility';

/** Controller for one row of the files page, including its archive contents toggle. */
export function useFileListItem(file: UploadedFile): UseFileListItemReturn {
  const { t } = useTranslation();
  const { isOpen, toggle } = useToggle(false);
  const { Icon, tone } = getFileTypeDescriptor(file.mimeType, file.filename);

  return {
    t,
    statusLabel: t(INGESTION_STATUS_LABELS[file.ingestionStatus]),
    statusColor: INGESTION_STATUS_COLORS[file.ingestionStatus],
    typeIcon: Icon,
    typeTone: tone,
    isArchive: isArchiveFile(file),
    archiveFileCount: getArchiveFileCount(file),
    rejection: getArchiveRejection(file.extractionError, file.ingestionStatus),
    isExpanded: isOpen,
    toggleExpanded: toggle,
  };
}
