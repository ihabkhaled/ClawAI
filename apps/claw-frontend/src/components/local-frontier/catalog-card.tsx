'use client';

import { Download, ExternalLink, Loader2, Power, Settings, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  FrontierDownloadStatus,
  FrontierLoadStatus,
  HardwareCompat,
} from '@/enums/local-frontier.enum';
import { type CompatChipMeta, type FrontierCatalogEntry } from '@/types/local-frontier.types';
import { formatBytes } from '@/utilities/local-frontier-compat.utility';

import { HardwareCompatChip } from './hardware-compat-chip';
import { QualityTierBadge } from './quality-tier-badge';

interface CatalogCardProps {
  entry: FrontierCatalogEntry;
  compat: CompatChipMeta;
  onPullClick: (entry: FrontierCatalogEntry) => void;
  onLoadClick: (entry: FrontierCatalogEntry) => void;
  onUnloadClick: (entry: FrontierCatalogEntry) => void;
  onDeleteClick: (entry: FrontierCatalogEntry) => void;
  onConfigureClick: (entry: FrontierCatalogEntry) => void;
  isPullPending: boolean;
  labels: {
    download: string;
    load: string;
    unload: string;
    deleteWeights: string;
    configure: string;
    fits: string;
    warns: string;
    refuses: string;
    survival: string;
    balanced: string;
    best: string;
    sourceLink: string;
    contextLength: string;
    requiresRamGb: string;
  };
}

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
  const compatLabel =
    compat.chip === HardwareCompat.FITS
      ? labels.fits
      : (compat.chip === HardwareCompat.REFUSES
        ? labels.refuses
        : labels.warns);
  const tierLabel =
    entry.qualityTier === 'SURVIVAL'
      ? labels.survival
      : (entry.qualityTier === 'BEST'
        ? labels.best
        : labels.balanced);

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
      <p className="text-sm text-muted-foreground line-clamp-2">{entry.description}</p>
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
