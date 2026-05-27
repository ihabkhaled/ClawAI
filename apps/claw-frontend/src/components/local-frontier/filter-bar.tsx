'use client';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ALL_FILTER_VALUE,
  LOCAL_FRONTIER_SEARCH_MAX_LENGTH,
} from '@/constants/local-frontier.constants';
import { FrontierModelCategory, FrontierQualityTier } from '@/enums/local-frontier.enum';
import type { FilterBarProps } from '@/types/local-frontier-ui.types';

export function FilterBar({
  category,
  qualityTier,
  compatibleOnly,
  searchInput,
  isRefreshing,
  onCategoryChange,
  onQualityTierChange,
  onCompatibleOnlyChange,
  onSearchChange,
  onRefreshCatalog,
  labels,
}: FilterBarProps): React.ReactElement {
  return (
    <section
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
      aria-label={labels.category}
    >
      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="lf-search">
          {labels.searchLabel}
        </label>
        <Input
          id="lf-search"
          type="search"
          value={searchInput}
          maxLength={LOCAL_FRONTIER_SEARCH_MAX_LENGTH}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={labels.searchPlaceholder}
          className="h-9"
        />
      </div>
      <div className="flex min-w-[160px] flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="lf-category">
          {labels.category}
        </label>
        <Select
          value={category ?? ALL_FILTER_VALUE}
          onValueChange={(val) =>
            onCategoryChange(val === ALL_FILTER_VALUE ? undefined : (val as FrontierModelCategory))
          }
        >
          <SelectTrigger id="lf-category" className="h-9">
            <SelectValue placeholder={labels.allCategories} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>{labels.allCategories}</SelectItem>
            <SelectItem value={FrontierModelCategory.CODING}>{labels.categoryCoding}</SelectItem>
            <SelectItem value={FrontierModelCategory.REASONING}>
              {labels.categoryReasoning}
            </SelectItem>
            <SelectItem value={FrontierModelCategory.THINKING}>
              {labels.categoryThinking}
            </SelectItem>
            <SelectItem value={FrontierModelCategory.GENERAL}>{labels.categoryGeneral}</SelectItem>
            <SelectItem value={FrontierModelCategory.FILE_GENERATION}>
              {labels.categoryFileGen}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-[160px] flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="lf-tier">
          {labels.qualityTier}
        </label>
        <Select
          value={qualityTier ?? ALL_FILTER_VALUE}
          onValueChange={(val) =>
            onQualityTierChange(val === ALL_FILTER_VALUE ? undefined : (val as FrontierQualityTier))
          }
        >
          <SelectTrigger id="lf-tier" className="h-9">
            <SelectValue placeholder={labels.allTiers} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>{labels.allTiers}</SelectItem>
            <SelectItem value={FrontierQualityTier.SURVIVAL}>{labels.tierSurvival}</SelectItem>
            <SelectItem value={FrontierQualityTier.BALANCED}>{labels.tierBalanced}</SelectItem>
            <SelectItem value={FrontierQualityTier.BEST}>{labels.tierBest}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
        <Checkbox
          checked={compatibleOnly}
          onCheckedChange={(state) => onCompatibleOnlyChange(state === true)}
          aria-label={labels.compatibleOnly}
        />
        <span>{labels.compatibleOnly}</span>
      </label>

      <div className="ml-auto">
        <Button
          size="sm"
          variant="outline"
          onClick={onRefreshCatalog}
          disabled={isRefreshing}
          aria-label={labels.refreshCatalog}
        >
          <RefreshCw className={`size-3 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden />
          {isRefreshing ? labels.refreshing : labels.refreshCatalog}
        </Button>
      </div>
    </section>
  );
}
