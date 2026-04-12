import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
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

  const isSelected = (provider: string, model: string): boolean =>
    selectedModels.some((m) => m.provider === provider && m.model === model);

  const isMaxReached = selectedModels.length >= MAX_PARALLEL_MODELS;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('compare.selectModels')}</h3>
        <span className="text-xs text-muted-foreground">
          {selectedModels.length}/{MAX_PARALLEL_MODELS}
        </span>
      </div>

      {selectionError ? (
        <p className="text-xs text-destructive">{selectionError}</p>
      ) : null}

      <div className="max-h-64 space-y-4 overflow-y-auto rounded-md border p-3">
        {groupedModels
          .filter((g) => !g.provider.startsWith('IMAGE_'))
          .map((group) => (
            <div key={group.provider}>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase">
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
                        'w-full justify-start gap-2 text-sm',
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
