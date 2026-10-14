'use client';

import { X } from 'lucide-react';
import type { ReactElement } from 'react';

import { BoardFilters } from '@/components/threads/board/board-filters';
import { LazyBoardFiltersSheet } from '@/components/threads/board/board-filters-sheet-lazy';
import { BoardSearchCombobox } from '@/components/threads/board/board-search-combobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BOARD_SORT_OPTIONS } from '@/constants/thread-board-view.constants';
import { BadgeVariant } from '@/enums/badge-variant.enum';
import { useTranslation } from '@/lib/i18n';
import type { BoardToolbarProps } from '@/types/thread-board-view.types';

export function BoardToolbar(props: BoardToolbarProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3" data-testid="board-toolbar">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <BoardSearchCombobox value={props.q} lang={props.lang} onSubmit={props.onSearch} />
        </div>
        <Select value={props.sort} onValueChange={props.onSort}>
          <SelectTrigger aria-label={t('chat.threadBoardSortLabel')} className="min-h-11 md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOARD_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.translationKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden md:block">
          <BoardFilters
            idPrefix="board"
            lang={props.lang}
            type={props.type}
            onLanguageChange={props.onLanguageChange}
            onTypeChange={props.onTypeChange}
          />
        </div>
        <LazyBoardFiltersSheet
          lang={props.lang}
          type={props.type}
          activeCount={props.activeFilterCount}
          onLanguageChange={props.onLanguageChange}
          onTypeChange={props.onTypeChange}
          onClear={props.onClear}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground text-sm" role="status" data-testid="board-count">
          {t('chat.threadBoardResultsCount', { count: props.total })}
        </p>
        {props.chips.map((chip) => (
          <Badge key={chip.kind} variant={BadgeVariant.SECONDARY} className="gap-1 ps-2.5 pe-1">
            {chip.label}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="rounded-full"
              aria-label={`${t('chat.threadBoardClearFilters')}: ${chip.label}`}
              onClick={() => props.onRemoveChip(chip.kind)}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
          </Badge>
        ))}
        {props.hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11"
            onClick={props.onClear}
          >
            {t('chat.threadBoardClearFilters')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
