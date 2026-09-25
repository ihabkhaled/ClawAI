import { ComposerAttachmentTile } from '@/components/chat/composer-attachment-tile';
import { ComposerPendingAttachmentTile } from '@/components/chat/composer-pending-attachment-tile';
import { useTranslation } from '@/lib/i18n';
import type { ComposerAttachmentTrayProps } from '@/types/composer-attachment.types';

/**
 * What is attached, above the textarea — the way ChatGPT and Claude show it.
 * Until this existed the only sign of an attachment was a number on the
 * paperclip, so a user could not tell which voice note or PDF was about to go
 * out, or take one back. Renders nothing when nothing is attached; wraps on a
 * phone rather than scrolling sideways, so every remove button stays reachable.
 * On a SHORT viewport (a phone in landscape, `short-viewport:` in globals.css)
 * it is one sideways-scrolling row capped in dvh instead: there, wrapping took
 * the height the send button needed (found live at 740x360, 2026-09-25).
 */
export function ComposerAttachmentTray({
  fileIds,
  pendingUploads,
  progress,
  onRemove,
  disabled,
  statusByFileId,
  processingCancelByFileId,
  onCancelUpload,
}: ComposerAttachmentTrayProps): React.ReactElement | null {
  const { t } = useTranslation();

  if (fileIds.length === 0 && pendingUploads.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label={t('chat.attachment.trayLabel')}
      aria-live="polite"
      className="short-viewport:max-h-[22dvh] short-viewport:flex-nowrap short-viewport:overflow-x-auto flex max-h-36 flex-wrap gap-3 overflow-y-auto px-1 pt-2 pb-1 sm:max-h-60"
      data-testid="composer-attachment-tray"
    >
      {fileIds.map((fileId) => (
        <ComposerAttachmentTile
          key={fileId}
          fileId={fileId}
          onRemove={onRemove}
          disabled={disabled}
          status={statusByFileId?.get(fileId)}
          processingCancel={processingCancelByFileId?.get(fileId)}
        />
      ))}
      {pendingUploads.map((upload) => (
        <ComposerPendingAttachmentTile
          key={upload.key}
          upload={upload}
          progress={progress}
          onCancel={onCancelUpload}
          cancelLabel={t('chat.attachment.cancelUpload', { name: upload.filename })}
        />
      ))}
    </ul>
  );
}
