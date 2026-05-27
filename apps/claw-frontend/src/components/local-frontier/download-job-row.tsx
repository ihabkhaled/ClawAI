'use client';

import { FileDown, Loader2, RotateCw, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FrontierPullJobPhase, FrontierPullJobStatus } from '@/enums/local-frontier.enum';
import { useElapsedSince } from '@/hooks/local-frontier/use-elapsed-since';
import type { DownloadJobRowProps } from '@/types/local-frontier-ui.types';
import { formatDuration, formatSpeed } from '@/utilities/format-duration.utility';
import { formatBytes, formatPercent } from '@/utilities/local-frontier-compat.utility';

// Merged from two parallel streams: agent #4 (UI polish — icon + 6-stat grid
// + clientside ticking elapsed timer via useElapsedSince) and agent #1
// (download-resilience — INSTALLING phase, retry counter, resumed marker).
// Layout follows agent #4's grid; agent #1's phase branch and retry/resumed
// indicators are folded in as additional stat cells.

export function DownloadJobRow({
  view,
  onCancel,
  onRetry,
  labels,
}: DownloadJobRowProps): React.ReactElement {
  const { job, progress, entry } = view;
  const downloaded = progress?.bytesDownloaded ?? job.downloadedBytes;
  const total = progress?.totalBytes ?? job.totalBytes;
  const percent = formatPercent(Number(downloaded), Number(total));
  const status = progress?.status ?? job.status;
  const phase = progress?.phase ?? job.phase ?? FrontierPullJobPhase.DOWNLOADING;
  const currentFile = progress?.currentFile ?? job.currentFile;
  const speedBytesPerSec = progress?.speedBytesPerSec ?? 0;
  const eta = progress?.etaSeconds;
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

  // Clientside ticking timer — freezes at terminal state.
  const elapsedMs = useElapsedSince(job.startedAt, !isActive) ?? 0;
  const elapsedLabel = elapsedMs > 0 ? formatDuration(elapsedMs) : '—';
  const mbpsLabel = speedBytesPerSec > 0 ? formatSpeed(speedBytesPerSec) : '—';
  const etaLabel = typeof eta === 'number' && eta > 0 ? formatDuration(eta * 1000) : '—';
  const bytesLabel = `${formatBytes(Number(downloaded))} / ${formatBytes(Number(total))}`;
  const phaseLabel = isActive && currentFile === null ? labels.preparing : null;
  const fileSubtitle = isInstalling
    ? `${labels.installing}${installStep ? ` — ${installStep}` : ''}`
    : currentFile ?? phaseLabel ?? labels.unknown;

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{fileSubtitle}</p>
          </div>
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
              {elapsedLabel} {labels.elapsed}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
          <span>
            <span className="text-foreground">{percent}%</span>
            <span className="ms-1 text-[10px] uppercase text-muted-foreground/70">
              {labels.percent}
            </span>
          </span>
          <span title={`${labels.bytes}: ${bytesLabel}`}>
            <span className="text-foreground">{bytesLabel}</span>
          </span>
          <span title={labels.rate}>
            <span className="text-foreground">{mbpsLabel}</span>
          </span>
          <span title={labels.eta}>
            <span className="text-foreground">{labels.eta}: </span>
            {etaLabel}
          </span>
          <span title={labels.elapsed}>
            <span className="text-foreground">{labels.elapsed}: </span>
            {elapsedLabel}
          </span>
          <span>
            <span className="text-foreground">
              {progress?.completedFiles ?? job.completedFiles}/
              {progress?.totalFiles ?? job.totalFiles}
            </span>{' '}
            {labels.files}
          </span>
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel(job.id)}
            className="gap-1.5"
          >
            <X className="size-3" aria-hidden />
            {labels.cancel}
          </Button>
        ) : null}
        {canRetry ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRetry(job.id)}
            className="gap-1.5"
          >
            <RotateCw className="size-3" aria-hidden />
            {labels.retry}
          </Button>
        ) : null}
        {canDismiss ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel(job.id)}
            className="gap-1.5"
          >
            <Trash2 className="size-3" aria-hidden />
            {labels.remove}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
