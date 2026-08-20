import { ChevronDown, MoreVertical, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { INGESTION_STATUS_COLORS, INGESTION_STATUS_LABELS } from '@/constants';
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
    <div className="rounded-lg border p-3 transition-colors hover:border-primary/50 sm:p-4">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-all text-sm font-medium sm:truncate">{file.filename}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="max-w-full truncate">{file.mimeType}</span>
            <span aria-hidden="true">•</span>
            <span>{formatFileSize(file.sizeBytes)}</span>
            <span aria-hidden="true">•</span>
            <span title={file.createdAt}>{formatTimeAgo(file.createdAt)}</span>
          </div>
        </div>
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('files.fileFallback')}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onViewChunks(file.id)}>
                <ChevronDown className="me-2 h-4 w-4" />
                {t('files.viewChunks')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(file.id)} disabled={isDeletePending}>
                <Trash2 className="me-2 h-4 w-4" />
                {t('files.deleteFile')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 sm:ms-14 sm:mt-2">
        <Badge variant="outline" className={cn('text-xs', statusColor)}>{statusLabel}</Badge>
        <FileRetentionBadge retentionExpiresAt={file.retentionExpiresAt} />
        <div className="ms-auto hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="icon" onClick={() => onViewChunks(file.id)}>
            <ChevronDown className="h-4 w-4" />
            <span className="sr-only">{t('files.viewChunks')}</span>
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(file.id)} disabled={isDeletePending}>
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">{t('files.deleteFile')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
