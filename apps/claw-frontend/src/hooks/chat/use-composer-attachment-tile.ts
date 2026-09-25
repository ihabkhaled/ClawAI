import { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';
import { useAttachmentFileMeta } from '@/hooks/files/use-attachment-file-meta';
import { useTranslation } from '@/lib/i18n';
import type { UseComposerAttachmentTileReturn } from '@/types/composer-attachment.types';
import { getAttachmentPreviewKind } from '@/utilities/attachment-preview.utility';
import { getFileTypeDescriptor } from '@/utilities/file-type-icon.utility';
import { formatFileSize } from '@/utilities/format.utility';

/**
 * One attached file above the composer: what it is (image, voice note, video,
 * document), what to call it, and how big it is. Metadata is cached per file,
 * so the same query the sent message uses later is already warm. The render
 * branch is decided here, so the tile component is a flat set of conditions.
 */
export function useComposerAttachmentTile(fileId: string): UseComposerAttachmentTileReturn {
  const { t } = useTranslation();
  const { file, isLoading } = useAttachmentFileMeta(fileId);
  const label = file?.filename ?? t('chat.attachedFile');
  const kind = file === undefined ? null : getAttachmentPreviewKind(file.mimeType, file.filename);
  const mediaKind =
    kind === AttachmentPreviewKind.Audio || kind === AttachmentPreviewKind.Video ? kind : null;
  const isMedia = mediaKind !== null;

  return {
    file,
    kind,
    mediaKind,
    showPlaceholder: isLoading || file === undefined,
    showImage: !isLoading && kind === AttachmentPreviewKind.Image,
    showMedia: !isLoading && isMedia,
    showDocument: !isLoading && kind !== null && kind !== AttachmentPreviewKind.Image && !isMedia,
    descriptor: file === undefined ? null : getFileTypeDescriptor(file.mimeType, file.filename),
    label,
    sizeLabel: file === undefined ? null : formatFileSize(file.sizeBytes),
    removeLabel: t('chat.attachment.remove', { name: label }),
  };
}
