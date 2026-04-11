import { CheckCircle, Download, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PULL_JOB_STATUS_LABELS } from '@/constants';
import type { CatalogModelCardProps } from '@/types';

export function CatalogModelAction({
  entry,
  job,
  onPull,
  onDelete,
  isPullPending,
  isDeletePending,
  t,
}: CatalogModelCardProps) {
  const activeStatus = job?.status ?? entry.pullJobStatus;

  if (activeStatus === 'PENDING' || activeStatus === 'IN_PROGRESS') {
    return (
      <Button variant="ghost" size="sm" disabled className="w-full">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {PULL_JOB_STATUS_LABELS[activeStatus] ?? t('catalog.downloading')}
      </Button>
    );
  }

  if (entry.isInstalled) {
    return (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" disabled className="flex-1">
          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
          {t('catalog.installed')}
        </Button>
        {entry.installedModelId ? (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(entry.installedModelId as string)}
            disabled={isDeletePending}
          >
            {isDeletePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        ) : null}
      </div>
    );
  }

  if (activeStatus === 'FAILED') {
    return (
      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => onPull(entry.id)}
        disabled={isPullPending}
      >
        <Download className="mr-2 h-4 w-4" />
        {t('catalog.failed')} - {t('common.retry')}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => onPull(entry.id)}
      disabled={isPullPending}
    >
      <Download className="mr-2 h-4 w-4" />
      {t('catalog.download')}
    </Button>
  );
}
