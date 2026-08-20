import { Check, Search } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MAX_PARALLEL_MODELS } from '@/constants';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import type { ParallelModelSelectorProps } from '@/types';
import { cn } from '@/utilities';

export function ParallelModelSelector({
  selectedModels,
  onToggleModel,
  selectionError,
  t,
}: ParallelModelSelectorProps) {
  const { groupedModels, isLoading } = useAvailableModels();
  const [searchQuery, setSearchQuery] = useState('');

  const isSelected = (provider: string, model: string): boolean =>
    selectedModels.some((m) => m.provider === provider && m.model === model);

  const isMaxReached = selectedModels.length >= MAX_PARALLEL_MODELS;

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t('common.loading')}</p>;
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleGroups = groupedModels
    .filter((g) => !g.provider.startsWith('IMAGE_'))
    .map((group) => ({
      ...group,
      models:
        normalizedQuery === ''
          ? group.models
          : group.models.filter((model) =>
              model.displayName.toLowerCase().includes(normalizedQuery),
            ),
    }))
    .filter((group) => group.models.length > 0);
  const hasNoSearchResults = normalizedQuery !== '' && visibleGroups.length === 0;

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
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('common.search')}
          className="h-8 pl-8 text-sm"
          aria-label={t('common.search')}
        />
      </div>

      <div className="max-h-[min(16rem,42dvh)] touch-pan-y space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border p-2 sm:p-3">
        {hasNoSearchResults ? (
          <p className="text-muted-foreground py-4 text-center text-sm">{t('common.noResults')}</p>
        ) : null}
        {visibleGroups.map((group) => (
          <div key={group.provider}>
            <p className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.models.map((model) => {
                const checked = isSelected(model.provider, model.model);
                const disabled = !checked && isMaxReached;
                return (
                  <Button
                    key={`${model.provider}:${model.model}`}
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className={cn(
                      'min-h-11 w-full min-w-0 justify-start gap-2 px-2 text-sm',
                      checked && 'bg-accent',
                    )}
                    onClick={() => onToggleModel(model.provider, model.model, !checked)}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        checked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground',
                      )}
                    >
                      {checked ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="truncate">{model.displayName}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
