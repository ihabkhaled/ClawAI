import { Archive, ChevronDown, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';

import { ArchiveEntryTree } from '@/components/files/archive/archive-entry-tree';
import { ArchiveRejectionNotice } from '@/components/files/archive/archive-rejection-notice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFileListItem } from '@/hooks/files/use-file-list-item';
import { cn } from '@/lib/utils';
import type { FileListItemProps } from '@/types';
import { formatFileSize, formatTimeAgo } from '@/utilities';

import { FileRetentionBadge } from './file-retention-badge';

export function FileListItem({ file, onDelete, onViewChunks, isDeletePending }: FileListItemProps) {
  const ctrl = useFileListItem(file);
  const { t } = ctrl;
  const TypeIcon = ctrl.typeIcon;

  return (
    <div className="hover:border-primary/50 rounded-lg border p-3 transition-colors sm:p-4">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            ctrl.typeTone,
          )}
        >
          <TypeIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium break-all sm:truncate">{file.filename}</p>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
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
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(file.id)}
                disabled={isDeletePending}
              >
                <Trash2 className="me-2 h-4 w-4" />
                {t('files.deleteFile')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 sm:ms-14 sm:mt-2">
        <Badge variant="outline" className={cn('text-xs', ctrl.statusColor)}>
          {ctrl.statusLabel}
        </Badge>
        {ctrl.isArchive ? (
          <Badge variant="outline" className="gap-1 text-xs" data-testid="archive-badge">
            <Archive className="h-3 w-3" aria-hidden="true" />
            {t('files.archive.badge')}
            {ctrl.archiveFileCount > 0 ? (
              <span className="text-muted-foreground">
                · {t('files.archive.fileCount', { count: ctrl.archiveFileCount })}
              </span>
            ) : null}
          </Badge>
        ) : null}
        <FileRetentionBadge retentionExpiresAt={file.retentionExpiresAt} />
        <div className="ms-auto hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="icon" onClick={() => onViewChunks(file.id)}>
            <ChevronDown className="h-4 w-4" />
            <span className="sr-only">{t('files.viewChunks')}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(file.id)}
            disabled={isDeletePending}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">{t('files.deleteFile')}</span>
          </Button>
        </div>
      </div>

      {ctrl.rejection === null ? null : (
        <ArchiveRejectionNotice rejection={ctrl.rejection} t={t} className="mt-3 p-3 sm:ms-14" />
      )}

      {ctrl.isArchive && ctrl.archiveFileCount > 0 ? (
        <div className="mt-2 sm:ms-14">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={ctrl.isExpanded}
            onClick={ctrl.toggleExpanded}
            className="touch:min-h-11 -ms-2 h-8 gap-1 px-2 text-xs"
            data-testid="archive-contents-toggle"
          >
            {ctrl.isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            )}
            {t(ctrl.isExpanded ? 'files.archive.hideContents' : 'files.archive.showContents')}
          </Button>
          {ctrl.isExpanded ? (
            <ArchiveEntryTree
              archiveFileId={file.id}
              className="bg-muted/30 mt-1 max-h-96 overflow-y-auto rounded-md border p-1"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
