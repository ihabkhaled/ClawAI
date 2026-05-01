'use client';

import { HardwareCompat } from '@/enums/local-frontier.enum';
import { type CompatChipMeta, type FrontierCatalogEntry } from '@/types/local-frontier.types';

import { CatalogCard } from './catalog-card';

const FALLBACK_COMPAT: CompatChipMeta = { chip: HardwareCompat.WARNS, reasons: [] };

interface CatalogGridProps {
  entries: FrontierCatalogEntry[];
  compatByEntry: Map<string, CompatChipMeta>;
  onPullClick: (entry: FrontierCatalogEntry) => void;
  onLoadClick: (entry: FrontierCatalogEntry) => void;
  onUnloadClick: (entry: FrontierCatalogEntry) => void;
  onDeleteClick: (entry: FrontierCatalogEntry) => void;
  onConfigureClick: (entry: FrontierCatalogEntry) => void;
  isPullPending: boolean;
  labels: React.ComponentProps<typeof CatalogCard>['labels'];
}

export function CatalogGrid({
  entries,
  compatByEntry,
  onPullClick,
  onLoadClick,
  onUnloadClick,
  onDeleteClick,
  onConfigureClick,
  isPullPending,
  labels,
}: CatalogGridProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <CatalogCard
          key={entry.id}
          entry={entry}
          compat={compatByEntry.get(entry.id) ?? FALLBACK_COMPAT}
          onPullClick={onPullClick}
          onLoadClick={onLoadClick}
          onUnloadClick={onUnloadClick}
          onDeleteClick={onDeleteClick}
          onConfigureClick={onConfigureClick}
          isPullPending={isPullPending}
          labels={labels}
        />
      ))}
    </div>
  );
}
