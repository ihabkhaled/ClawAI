import { ChevronDown, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { INGESTION_STATUS_LABELS, INGESTION_STATUS_COLORS } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { FileListItemProps } from '@/types';
import { formatFileSize, formatTimeAgo, getFileTypeDescriptor } from '@/utilities';

import { FileRetentionBadge } from './file-retention-badge';

export function FileListItem({ file, onDelete, onViewChunks, isDeletePending }: FileListItemProps) {
  const { t } = useTranslation();
  const statusLabel = t(INGESTION_STATUS_LABELS[file.ingestionStatus] ?? file.ingestionStatus);
  const statusColor =
    INGESTION_STATUS_COLORS[file.ingestionStatus] ??
    'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800';

  const { Icon, tone } = getFileTypeDescriptor(file.mimeType, file.filename);

  return (
    <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:border-primary/50">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          tone,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.filename}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="truncate">{file.mimeType}</span>
          <span aria-hidden="true">•</span>
          <span>{formatFileSize(file.sizeBytes)}</span>
          <span aria-hidden="true">•</span>
          <span title={file.createdAt}>{formatTimeAgo(file.createdAt)}</span>
        </div>
      </div>
      <Badge variant="outline" className={cn('shrink-0 text-xs', statusColor)}>
        {statusLabel}
      </Badge>
      <FileRetentionBadge retentionExpiresAt={file.retentionExpiresAt} />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onViewChunks(file.id)}
      >
        <ChevronDown className="h-4 w-4" />
        <span className="sr-only">{t('files.viewChunks')}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
        onClick={() => onDelete(file.id)}
        disabled={isDeletePending}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">{t('files.deleteFile')}</span>
      </Button>
    </div>
  );
}
