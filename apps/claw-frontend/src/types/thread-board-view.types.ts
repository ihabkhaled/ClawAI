import type { BoardChipKind } from '@/enums/board-chip-kind.enum';
import type { ThreadBoardItem, ThreadBoardType } from '@/types/thread-board.types';

export type BoardCardItem = ThreadBoardItem;

export type BoardFilterValues = {
  lang: string;
  type: ThreadBoardType;
};

export type BoardChip = {
  kind: BoardChipKind;
  label: string;
};

export type BoardCardProps = { item: BoardCardItem };

export type BoardGridProps = { items: readonly BoardCardItem[] };

export type BoardFiltersProps = BoardFilterValues & {
  idPrefix: string;
  onLanguageChange: (lang: string) => void;
  onTypeChange: (type: string) => void;
};

export type BoardFiltersSheetProps = BoardFilterValues & {
  activeCount: number;
  onLanguageChange: (lang: string) => void;
  onTypeChange: (type: string) => void;
  onClear: () => void;
};

export type BoardToolbarProps = BoardFilterValues & {
  q: string;
  sort: string;
  total: number;
  chips: readonly BoardChip[];
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onSearch: (q: string) => void;
  onSort: (sort: string) => void;
  onLanguageChange: (lang: string) => void;
  onTypeChange: (type: string) => void;
  onRemoveChip: (kind: BoardChipKind) => void;
  onClear: () => void;
};

export type BoardPaginationProps = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export type BoardEmptyProps = {
  hasQuery: boolean;
  hasActiveFilters: boolean;
  onClear: () => void;
};

export type BoardErrorProps = { onRetry: () => void };

export type BoardChipInput = BoardFilterValues & { q: string };
