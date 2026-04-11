import { CheckCircle, Download, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PULL_JOB_STATUS_LABELS } from '@/constants';
import type { CatalogModelCardProps } from '@/types';

export function CatalogModelAction({
  entry,
  job,
  onPull,
  isPullPending,
  t,
}: CatalogModelCardProps) {
  if (job?.status === 'COMPLETED') {
    return (
      <Button variant="ghost" size="sm" disabled className="w-full">
        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
        {t('catalog.installed')}
      </Button>
    );
  }

  if (job?.status === 'PENDING' || job?.status === 'IN_PROGRESS') {
    return (
      <Button variant="ghost" size="sm" disabled className="w-full">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {PULL_JOB_STATUS_LABELS[job.status] ?? t('catalog.downloading')}
      </Button>
    );
  }

  if (job?.status === 'FAILED') {
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
