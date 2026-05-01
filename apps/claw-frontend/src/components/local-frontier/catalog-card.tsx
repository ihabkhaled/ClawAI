'use client';

import { Download, ExternalLink, Loader2, Power, Settings, Trash2 } from 'lucide-react';

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
  const refused = compat.chip === HardwareCompat.REFUSES;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">{entry.displayName}</h3>
          <p className="text-xs text-muted-foreground">
            {entry.parameterCount} · {entry.contextLength.toLocaleString()} {labels.contextLength}
          </p>
        </div>
        <QualityTierBadge tier={entry.qualityTier} label={tierLabel} />
      </div>
      <p className="line-clamp-2 text-sm text-muted-foreground">{entry.description}</p>
      <div className="flex flex-wrap items-center gap-2">
        <HardwareCompatChip chip={compat.chip} label={compatLabel} />
        <span className="text-xs text-muted-foreground">
          {formatBytes(entry.fileSizeBytes)} · {entry.requiredRamGb} {labels.requiresRamGb}
        </span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <a
          href={entry.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          aria-label={`${labels.sourceLink}: ${entry.huggingfaceRepo}`}
        >
          <ExternalLink className="size-3" aria-hidden />
          {labels.sourceLink}
        </a>
        <div className="flex flex-wrap gap-2">
          {downloadable ? (
            <Button
              size="sm"
              disabled={isPullPending}
              onClick={() => onPullClick(entry)}
              variant={refused ? 'outline' : 'default'}
            >
              {isPullPending ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <Download className="size-3" aria-hidden />
              )}
              {labels.download}
            </Button>
          ) : null}
          {isDownloaded && !loaded ? (
            <Button size="sm" variant="secondary" onClick={() => onLoadClick(entry)}>
              <Power className="size-3" aria-hidden />
              {labels.load}
            </Button>
          ) : null}
          {loaded ? (
            <>
              <Button size="sm" variant="outline" onClick={() => onUnloadClick(entry)}>
                <Power className="size-3" aria-hidden />
                {labels.unload}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConfigureClick(entry)}
                aria-label={labels.configure}
              >
                <Settings className="size-3" aria-hidden />
              </Button>
            </>
          ) : null}
          {isDownloaded ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeleteClick(entry)}
              aria-label={labels.deleteWeights}
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
