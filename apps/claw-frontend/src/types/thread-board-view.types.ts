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
  query: string;
  hasQuery: boolean;
  hasActiveFilters: boolean;
  onClear: () => void;
};

/** Set when the list was refused with 429; `retryAfterSeconds` is the server's Retry-After. */
export type BoardRateLimit = { retryAfterSeconds: number | null };

export type BoardErrorProps = { onRetry: () => void; rateLimit?: BoardRateLimit | null };

export type BoardChipInput = BoardFilterValues & { q: string };
