'use client';

import {
  Download,
  ExternalLink,
  HelpCircle,
  Loader2,
  Play,
  Power,
  Settings,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  FrontierDownloadStatus,
  FrontierLoadStatus,
  HardwareCompat,
} from '@/enums/local-frontier.enum';
import type { CatalogCardProps } from '@/types/local-frontier-ui.types';
import {
  formatBytes,
  pickCompatLabel,
  pickTierLabel,
} from '@/utilities/local-frontier-compat.utility';

import { HardwareCompatChip } from './hardware-compat-chip';
import { ModelStatusBadge } from './model-status-badge';
import { QualityTierBadge } from './quality-tier-badge';

export function CatalogCard({
  entry,
  compat,
  onPullClick,
  onLoadClick,
  onUnloadClick,
  onDeleteClick,
  onConfigureClick,
  isPullPending,
  labels,
}: CatalogCardProps): React.ReactElement {
  const compatLabel = pickCompatLabel(compat.chip, labels);
  const tierLabel = pickTierLabel(entry.qualityTier, labels);

  const downloadable = entry.downloadStatus === FrontierDownloadStatus.AVAILABLE;
  const isDownloaded = entry.downloadStatus === FrontierDownloadStatus.READY;
  const loaded = entry.loadStatus === FrontierLoadStatus.READY;
  const isLoading = entry.loadStatus === FrontierLoadStatus.LOADING;
  const refused = compat.chip === HardwareCompat.REFUSES;
  const showNotActiveHelp = isDownloaded && !loaded && !isLoading;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{entry.displayName}</h3>
          <p className="text-xs text-muted-foreground">
            {entry.parameterCount} &middot; {entry.contextLength.toLocaleString()}{' '}
            {labels.contextLength}
          </p>
        </div>
        <QualityTierBadge tier={entry.qualityTier} label={tierLabel} />
      </div>

      <ModelStatusBadge
        loadStatus={entry.loadStatus}
        isDownloaded={isDownloaded}
        labels={{
          active: labels.activeBadge,
          activeHint: labels.activeBadgeHint,
          idle: labels.idleBadge,
          idleHint: labels.idleBadgeHint,
          loading: labels.loadingBadge,
          crashed: labels.crashedBadge,
          crashedHint: labels.crashedBadgeHint,
        }}
      />

      <p className="line-clamp-2 text-sm text-muted-foreground">{entry.description}</p>

      <div className="flex flex-wrap items-center gap-2">
        <HardwareCompatChip chip={compat.chip} label={compatLabel} />
        <span className="text-xs text-muted-foreground">
          {formatBytes(entry.fileSizeBytes)} &middot; {entry.requiredRamGb} {labels.requiresRamGb}
          {entry.recommendedGpuVramGb > 0
            ? ` · ${String(entry.recommendedGpuVramGb)} ${labels.requiresVramGb}`
            : ''}
        </span>
      </div>

      {showNotActiveHelp ? (
        <p className="flex items-start gap-1.5 rounded-md bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
          <HelpCircle className="mt-0.5 size-3 shrink-0" aria-hidden />
          <span>{labels.notActiveHelp}</span>
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <a
          href={entry.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          aria-label={`${labels.sourceLink}: ${entry.huggingfaceRepo}`}
        >
          <ExternalLink className="size-3" aria-hidden />
          {labels.sourceLink}
        </a>
        <div className="flex flex-wrap justify-end gap-2">
          {downloadable ? (
            <Button
              size="sm"
              disabled={isPullPending}
              onClick={() => onPullClick(entry)}
              variant={refused ? 'outline' : 'default'}
              className="gap-1.5"
            >
              {isPullPending ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <Download className="size-3" aria-hidden />
              )}
              {labels.download}
            </Button>
          ) : null}
          {isDownloaded && !loaded && !isLoading ? (
            <Button
              size="sm"
              variant="default"
              onClick={() => onLoadClick(entry)}
              title={labels.activateHint}
              className="gap-1.5"
            >
              <Play className="size-3" aria-hidden />
              {labels.activate}
            </Button>
          ) : null}
          {isLoading ? (
            <Button size="sm" variant="secondary" disabled className="gap-1.5">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              {labels.loading}
            </Button>
          ) : null}
          {loaded ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUnloadClick(entry)}
                title={labels.deactivateHint}
                className="gap-1.5"
              >
                <Power className="size-3" aria-hidden />
                {labels.deactivate}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConfigureClick(entry)}
                aria-label={labels.configure}
                title={labels.configure}
              >
                <Settings className="size-3" aria-hidden />
              </Button>
            </>
          ) : null}
          {isDownloaded && !loaded && !isLoading ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeleteClick(entry)}
              aria-label={labels.deleteWeights}
              title={labels.deleteWeights}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
