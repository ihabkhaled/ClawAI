import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PULL_JOB_STATUS_LABELS } from '@/constants';
import type { DownloadProgressBarProps } from '@/types';
import { formatBytes } from '@/utilities';

export function DownloadProgressBar({
  job,
  onCancel,
  isCancelPending,
  t,
}: DownloadProgressBarProps) {
  const progressValue = job.progress ?? 0;
  const canCancel = job.status === 'PENDING' || job.status === 'IN_PROGRESS';

  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="truncate font-medium">{job.modelName}</span>
          <span className="shrink-0 text-muted-foreground">
            {PULL_JOB_STATUS_LABELS[job.status] ?? job.status}
          </span>
        </div>
        <Progress value={progressValue} className="h-2" />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{Math.round(progressValue)}%</span>
          {job.downloadedBytes !== null && job.totalBytes !== null ? (
            <span>
              {formatBytes(job.downloadedBytes)} / {formatBytes(job.totalBytes)}
            </span>
          ) : null}
        </div>
      </div>
      {canCancel ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onCancel(job.id)}
          disabled={isCancelPending}
          aria-label={t('catalog.cancel')}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
