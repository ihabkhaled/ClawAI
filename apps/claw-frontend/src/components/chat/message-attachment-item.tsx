import { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';
import { useMessageAttachmentItem } from '@/hooks/chat/use-message-attachment-item';
import { useAttachmentFileMeta } from '@/hooks/files/use-attachment-file-meta';
import type { MessageAttachmentItemProps } from '@/types/archive.types';
import { getAttachmentPreviewKind } from '@/utilities/attachment-preview.utility';

import { ArchiveAttachmentCard } from './archive-attachment-card';
import { AttachmentFilePreview } from './attachment-file-preview';
import { AttachmentMediaPreview } from './attachment-media-preview';
import { AttachmentPlaceholder } from './attachment-placeholder';
import { AttachmentThumbnail } from './attachment-thumbnail';

// Asks once (cached) whether the attachment is an archive before drawing it:
// the thumbnail downloads the file's bytes, which for a 50 MB archive is
// exactly the wrong thing to do just to show an icon. Non-archives used to
// ALL render through AttachmentThumbnail (an <img> tag) regardless of real
// type — a voice note, a video note, a PDF and a docx all rendered the
// browser's broken-image glyph, because their bytes are not decodable as an
// image. Metadata (mimeType) decides the real kind before anything renders.
export function MessageAttachmentItem({ fileId }: MessageAttachmentItemProps): React.ReactElement {
  const ctrl = useMessageAttachmentItem(fileId);
  const meta = useAttachmentFileMeta(fileId);

  if (ctrl.isResolving || meta.isLoading) {
    return <AttachmentPlaceholder />;
  }
  if (ctrl.listing !== undefined) {
    return (
      <ArchiveAttachmentCard
        listing={ctrl.listing}
        rejection={ctrl.rejection}
        isExpanded={ctrl.isExpanded}
        onToggle={ctrl.toggleExpanded}
        passwordPrompt={ctrl.passwordPrompt}
        t={ctrl.t}
      />
    );
  }
  if (meta.file === undefined) {
    // Metadata failed to resolve (404, transient error): fall back to the
    // best-effort image thumbnail rather than blocking the whole message. If
    // the download fails too (file past retention), the thumbnail degrades to
    // a translated "unavailable" card — never a broken <img>.
    return <AttachmentThumbnail fileId={fileId} />;
  }

  const kind = getAttachmentPreviewKind(meta.file.mimeType, meta.file.filename);
  if (kind === AttachmentPreviewKind.Image) {
    return <AttachmentThumbnail fileId={fileId} filename={meta.file.filename} />;
  }
  if (kind === AttachmentPreviewKind.Audio || kind === AttachmentPreviewKind.Video) {
    return (
      <AttachmentMediaPreview
        fileId={fileId}
        filename={meta.file.filename}
        mimeType={meta.file.mimeType}
        kind={kind}
        media={meta.file.extractionMetadata?.media}
      />
    );
  }
  return (
    <AttachmentFilePreview
      fileId={fileId}
      filename={meta.file.filename}
      mimeType={meta.file.mimeType}
      kind={kind}
    />
  );
}
