'use client';

import { Download, Heart, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HfResultsListProps } from '@/types/hf-search.types';
import { formatHfCount } from '@/utilities/hf-format.utility';

export function HfResultsList({
  results,
  isLoading,
  error,
  selectedRepo,
  onSelect,
  hasMore,
  isLoadingMore,
  onLoadMore,
  loadMoreLabel,
  loadingMoreLabel,
  resultsCountLabel,
}: HfResultsListProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="border-border bg-background/40 flex h-96 items-center justify-center rounded-md border">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    );
  }
  if (error) {
    return (
      <p className="border-destructive/40 bg-destructive/10 text-destructive flex h-96 items-center justify-center rounded-md border px-3 text-xs">
        {error.message}
      </p>
    );
  }
  if (results.length === 0) {
    return (
      <p className="border-border text-muted-foreground flex h-96 items-center justify-center rounded-md border border-dashed text-xs">
        No GGUF models matched.
      </p>
    );
  }
  return (
    <div className="flex h-96 flex-col gap-2">
      <ul className="border-border flex flex-1 flex-col gap-1 overflow-y-auto rounded-md border p-2">
        {results.map((model) => (
          <li key={model.id}>
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => onSelect(model.id)}
              className={cn(
                'hover:bg-muted flex w-full flex-col gap-0.5 rounded-sm px-2 py-1.5 text-left text-xs transition-colors',
                selectedRepo === model.id && 'bg-muted ring-primary ring-1',
              )}
            >
              <span className="text-foreground truncate font-medium">{model.id}</span>
              <span className="text-muted-foreground touch:text-xs flex items-center gap-3 text-[10px]">
                <span className="inline-flex items-center gap-1">
                  <Download className="size-3" aria-hidden />
                  {formatHfCount(model.downloads)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="size-3" aria-hidden />
                  {formatHfCount(model.likes)}
                </span>
                {model.pipelineTag ? <span>{model.pipelineTag}</span> : null}
              </span>
            </Button>
          </li>
        ))}
        {hasMore ? (
          <li className="px-1 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? <Loader2 className="mr-1 size-3 animate-spin" aria-hidden /> : null}
              {isLoadingMore ? loadingMoreLabel : loadMoreLabel}
            </Button>
          </li>
        ) : null}
      </ul>
      <p className="text-muted-foreground touch:text-xs text-[10px]" aria-live="polite">
        {resultsCountLabel}
      </p>
    </div>
  );
}
