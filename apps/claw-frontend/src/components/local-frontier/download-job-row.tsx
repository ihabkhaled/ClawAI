'use client';

import { Loader2, RotateCw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FrontierPullJobStatus } from '@/enums/local-frontier.enum';
import type { DownloadJobRowProps } from '@/types/local-frontier-ui.types';
import { formatBytes, formatPercent } from '@/utilities/local-frontier-compat.utility';

export function DownloadJobRow({
  view,
  onCancel,
  onRetry,
  labels,
}: DownloadJobRowProps): React.ReactElement {
  const { job, progress, entry } = view;
  const downloaded = progress?.bytesDownloaded ?? job.downloadedBytes;
  const total = progress?.totalBytes ?? job.totalBytes;
  const percent = formatPercent(downloaded, total);
  const status = progress?.status ?? job.status;
  const currentFile = progress?.currentFile ?? job.currentFile;
  const mbps = progress?.mbps ?? 0;
  const eta = progress?.etaSeconds;
  const errorMessage = progress?.errorMessage ?? job.errorMessage;

  const isActive =
    status === FrontierPullJobStatus.PENDING || status === FrontierPullJobStatus.RUNNING;
  const canRetry =
    status === FrontierPullJobStatus.FAILED || status === FrontierPullJobStatus.CANCELLED;
  const displayName = entry ? `${entry.displayName}` : job.modelId.slice(0, 8);

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{currentFile ?? labels.unknown}</p>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? <Loader2 className="size-3 animate-spin text-primary" aria-hidden /> : null}
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
            {status}
          </span>
        </div>
      </div>

      <Progress value={percent} className="h-2" />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {labels.bytes}: {formatBytes(Number(downloaded))} / {formatBytes(Number(total))} (
          {percent}
          %)
        </span>
        <span>
          {labels.files}: {progress?.completedFiles ?? job.completedFiles} /{' '}
          {progress?.totalFiles ?? job.totalFiles}
        </span>
        {mbps > 0 ? (
          <span>
            {labels.rate}: {mbps.toFixed(1)} MB/s
          </span>
        ) : null}
        {typeof eta === 'number' && eta > 0 ? (
          <span>
            {labels.eta}: {eta}s
          </span>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-sm bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {isActive ? (
          <Button size="sm" variant="outline" onClick={() => onCancel(job.id)}>
            <X className="size-3" aria-hidden />
            {labels.cancel}
          </Button>
        ) : null}
        {canRetry ? (
          <Button size="sm" variant="outline" onClick={() => onRetry(job.id)}>
            <RotateCw className="size-3" aria-hidden />
            {labels.retry}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
