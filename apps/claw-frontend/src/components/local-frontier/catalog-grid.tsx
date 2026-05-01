'use client';

import { FALLBACK_COMPAT } from '@/constants/local-frontier.constants';
import type { CatalogGridProps } from '@/types/local-frontier-ui.types';

import { CatalogCard } from './catalog-card';

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
