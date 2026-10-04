import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { MAX_PARALLEL_MODELS } from '@/constants';
import { PARALLEL_MODEL_LIST_HEIGHT } from '@/constants/model-picker.constants';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import { useParallelModelList } from '@/hooks/chat/use-parallel-model-list';
import { Virtuoso } from '@/lib/virtuoso';
import type { ParallelModelSelectorProps } from '@/types';
import { parallelModelRowKey } from '@/utilities/parallel-model-rows.utility';

export function ParallelModelSelector({
  selectedModels,
  onToggleModel,
  selectionError,
  t,
}: ParallelModelSelectorProps) {
  const { groupedModels, isLoading } = useAvailableModels();
  const list = useParallelModelList({ groupedModels, selectedModels, onToggleModel });

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t('common.loading')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('compare.selectModels')}</h3>
        <span className="text-muted-foreground text-xs">
          {selectedModels.length}/{MAX_PARALLEL_MODELS}
        </span>
      </div>

      {selectionError ? <p className="text-destructive text-xs">{selectionError}</p> : null}

      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
        <Input
          value={list.query}
          onChange={(event) => list.setQuery(event.target.value)}
          placeholder={t('common.search')}
          className="h-8 pl-8 text-sm"
          aria-label={t('common.search')}
        />
      </div>

      <div
        data-testid="parallel-model-list"
        className="touch-pan-y overflow-x-hidden rounded-md border p-2 sm:p-3"
      >
        {list.hasNoSearchResults ? (
          <p className="text-muted-foreground py-4 text-center text-sm">{t('common.noResults')}</p>
        ) : (
          <Virtuoso
            style={{ height: PARALLEL_MODEL_LIST_HEIGHT }}
            data={list.rows}
            computeItemKey={parallelModelRowKey}
            itemContent={list.itemContent}
          />
        )}
      </div>
    </div>
  );
}
