'use client';

import { Loader2, RotateCw, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FrontierPullJobPhase, FrontierPullJobStatus } from '@/enums/local-frontier.enum';
import type { DownloadJobRowProps } from '@/types/local-frontier-ui.types';
import { formatDuration, formatSpeed } from '@/utilities/format-duration.utility';
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
  const phase = progress?.phase ?? job.phase ?? FrontierPullJobPhase.DOWNLOADING;
  const currentFile = progress?.currentFile ?? job.currentFile;
  const speedBytesPerSec = progress?.speedBytesPerSec ?? 0;
  const eta = progress?.etaSeconds;
  const elapsedMs =
    progress?.elapsedMs ??
    (job.startedAt ? Date.now() - new Date(job.startedAt).getTime() : 0);
  const retryAttempts = progress?.retryAttempts ?? job.retryAttempts ?? 0;
  const installStep = progress?.installStep ?? job.installStep;
  const errorMessage = progress?.errorMessage ?? job.errorMessage;

  const isInstalling =
    status === FrontierPullJobStatus.INSTALLING ||
    phase === FrontierPullJobPhase.INSTALLING ||
    phase === FrontierPullJobPhase.FINALIZING;
  const isActive =
    status === FrontierPullJobStatus.PENDING ||
    status === FrontierPullJobStatus.RUNNING ||
    isInstalling;
  const canRetry =
    status === FrontierPullJobStatus.FAILED || status === FrontierPullJobStatus.CANCELLED;
  const canDismiss = !isActive;
  const displayName = entry ? `${entry.displayName}` : job.modelId.slice(0, 8);

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {isInstalling
              ? `${labels.installing}${installStep ? ` — ${installStep}` : ''}`
              : currentFile ?? labels.unknown}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? <Loader2 className="size-3 animate-spin text-primary" aria-hidden /> : null}
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
            {status}
          </span>
        </div>
      </div>

      <Progress value={isInstalling ? 100 : percent} className="h-2" />

      {isInstalling ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{labels.installingStepLabel}</span>
          {installStep ? <span className="font-mono text-foreground">{installStep}</span> : null}
          {elapsedMs > 0 ? (
            <span>
              {formatDuration(elapsedMs)} {labels.elapsed}
            </span>
          ) : null}
        </div>
      ) : (
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
          {speedBytesPerSec > 0 ? (
            <span>
              {labels.rate}: {formatSpeed(speedBytesPerSec)}
            </span>
          ) : null}
          {typeof eta === 'number' && eta > 0 ? (
            <span>
              {labels.eta}: {formatDuration(eta * 1000)}
            </span>
          ) : null}
          {elapsedMs > 0 ? (
            <span>
              {formatDuration(elapsedMs)} {labels.elapsed}
            </span>
          ) : null}
          {retryAttempts > 0 ? (
            <span className="text-amber-500">
              {labels.retryingLabel}: {retryAttempts}
            </span>
          ) : null}
          {job.resumedAt ? <span className="text-blue-500">{labels.resumedLabel}</span> : null}
        </div>
      )}

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
        {canDismiss ? (
          <Button size="sm" variant="outline" onClick={() => onCancel(job.id)}>
            <Trash2 className="size-3" aria-hidden />
            {labels.remove}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
