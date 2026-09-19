import { Clock, Download, FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { FileCompletedStateProps } from '@/types';
import { formatFileSizeLabel } from '@/utilities';

export function FileCompletedState({
  filename,
  format,
  sizeBytes,
  minutesLeft,
  isDownloading,
  downloadFailed,
  onDownload,
}: FileCompletedStateProps): React.ReactElement {
  const { t } = useTranslation();
  const sizeLabel = sizeBytes ? formatFileSizeLabel(sizeBytes) : '';

  return (
    <div className="border-border rounded-xl border p-4" data-testid="file-completed">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <FileText className="text-primary h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{filename}</div>
          <div className="text-muted-foreground text-xs">
            {format.toUpperCase()}
            {sizeLabel ? ` \u00b7 ${sizeLabel}` : ''}
          </div>
          {minutesLeft !== null ? (
            <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {t('chat.fileAvailableFor', { minutes: minutesLeft })}
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={isDownloading}
          onClick={onDownload}
          data-testid="file-download"
        >
          {isDownloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {t('common.download')}
        </Button>
      </div>
      {downloadFailed ? (
        <p className="text-destructive mt-2 text-xs" role="alert">
          {t('chat.fileDownloadFailed')}
        </p>
      ) : null}
    </div>
  );
}
