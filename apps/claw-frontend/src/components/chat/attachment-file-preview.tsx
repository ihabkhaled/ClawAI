import { Download, Eye, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';
import { useAttachmentFilePreview } from '@/hooks/chat/use-attachment-file-preview';
import type { AttachmentFilePreviewProps } from '@/types/attachment-preview.types';
import { getFileTypeDescriptor } from '@/utilities/file-type-icon.utility';

/**
 * A PDF, a text-like file, or anything else this app has no in-app viewer
 * for, under a sent message: the correct icon for its type, its name, and one
 * clear action — never the broken-image placeholder every non-image
 * attachment used to fall back to.
 */
export function AttachmentFilePreview({
  fileId,
  filename,
  mimeType,
  kind,
}: AttachmentFilePreviewProps): React.ReactElement {
  const { t, isLoading, error, previewText, isPreviewTruncated, view, download } =
    useAttachmentFilePreview(fileId, filename, kind);
  const { Icon, tone } = getFileTypeDescriptor(mimeType, filename);
  const isPdf = kind === AttachmentPreviewKind.Pdf;
  const isText = kind === AttachmentPreviewKind.Text;

  return (
    <div
      className="bg-card w-full min-w-0 rounded-lg border p-2 sm:w-64"
      data-testid="attachment-file-preview"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${tone}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={filename}>
          {filename}
        </span>
      </div>

      {previewText === null ? null : (
        <pre
          className="bg-muted text-muted-foreground mt-2 max-h-32 overflow-y-auto rounded p-2 text-[11px] whitespace-pre-wrap"
          data-testid="attachment-text-preview"
        >
          {previewText}
          {isPreviewTruncated ? '…' : ''}
        </pre>
      )}
      {previewText !== null && isPreviewTruncated ? (
        <p className="text-muted-foreground mt-1 text-[10px]">
          {t('chat.attachment.previewTruncated')}
        </p>
      ) : null}
      {error === null ? null : (
        <p className="text-destructive mt-1 text-[10px]">{t('chat.attachment.previewFailed')}</p>
      )}

      <div className="mt-2 flex gap-1.5">
        {isPdf || isText ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={view}
            disabled={isLoading}
            className="touch:min-h-11 h-8 gap-1 px-2 text-xs"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {t('chat.attachment.view')}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={download}
          disabled={isLoading}
          className="touch:min-h-11 h-8 gap-1 px-2 text-xs"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {t('chat.attachment.download')}
        </Button>
      </div>
    </div>
  );
}
