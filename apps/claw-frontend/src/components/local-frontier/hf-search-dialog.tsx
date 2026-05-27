'use client';

import { Loader2, Search } from 'lucide-react';
import { useEffect } from 'react';

import { HfDetailsPanel } from '@/components/local-frontier/hf-details-panel';
import { HfResultsList } from '@/components/local-frontier/hf-results-list';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HF_SORT_OPTIONS } from '@/constants/hf-search.constants';
import type { HfSearchSort } from '@/enums/hf-search.enum';
import { useHfSearchDialog } from '@/hooks/local-frontier/use-hf-search-dialog';
import { useTranslation } from '@/lib/i18n';
import type { HfSearchDialogProps } from '@/types/hf-search.types';

export function HfSearchDialog({ open, onOpenChange }: HfSearchDialogProps): React.ReactElement {
  const ctrl = useHfSearchDialog(open);
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) {
      ctrl.resetSelection();
    }
  }, [open, ctrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('localFrontier.hfSearch.title')}</DialogTitle>
          <DialogDescription>{t('localFrontier.hfSearch.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={ctrl.query}
              onChange={(event) => ctrl.setQuery(event.target.value)}
              placeholder={t('localFrontier.hfSearch.searchPlaceholder')}
              className="pl-8"
            />
          </div>
          <Select value={ctrl.sort} onValueChange={(value) => ctrl.setSort(value as HfSearchSort)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t('localFrontier.hfSearch.sortPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {HF_SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-[2fr_3fr] gap-3">
          <HfResultsList
            results={ctrl.results}
            isLoading={ctrl.isLoadingResults}
            error={ctrl.resultsError}
            selectedRepo={ctrl.selectedRepo}
            onSelect={ctrl.selectRepo}
            hasMore={ctrl.hasMoreResults}
            isLoadingMore={ctrl.isLoadingMoreResults}
            onLoadMore={ctrl.loadMoreResults}
            loadMoreLabel={t('localFrontier.hfSearch.loadMore')}
            loadingMoreLabel={t('localFrontier.hfSearch.loadingMore')}
            resultsCountLabel={t('localFrontier.hfSearch.resultsCount', {
              count: ctrl.results.length,
            })}
          />
          <HfDetailsPanel
            details={ctrl.details}
            isLoading={ctrl.isLoadingDetails}
            selectedRepo={ctrl.selectedRepo}
            quantization={ctrl.quantization}
            setQuantization={ctrl.setQuantization}
            category={ctrl.category}
            setCategory={ctrl.setCategory}
            qualityTier={ctrl.qualityTier}
            setQualityTier={ctrl.setQualityTier}
          />
        </div>

        {ctrl.importError ? (
          <p className="rounded-sm bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {ctrl.importError.message}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={ctrl.isImporting}>
            {t('localFrontier.hfSearch.close')}
          </Button>
          <Button
            onClick={() => {
              void ctrl.submitImport();
            }}
            disabled={!ctrl.selectedRepo || ctrl.isImporting || ctrl.isLoadingDetails}
            className="gap-1.5"
          >
            {ctrl.isImporting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {ctrl.isImporting
              ? t('localFrontier.hfSearch.importing')
              : t('localFrontier.hfSearch.importButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
