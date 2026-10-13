import type { ThreadPublicationType } from '@claw/shared-types';

import type { ThreadBoardAllFilter } from '@/enums/thread-board-all-filter.enum';
import type { ThreadBoardSort } from '@/enums/thread-board-sort.enum';
import type { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';

export type ThreadBoardPageSize = number;

/** A locale code, or `all`. */
export type ThreadBoardLanguage = string;
export type ThreadBoardType = ThreadPublicationType | ThreadBoardAllFilter;

export type ThreadBoardState = {
  q: string;
  sort: ThreadBoardSort;
  lang: ThreadBoardLanguage;
  type: ThreadBoardType;
  page: number;
};

export type ThreadBoardItem = {
  slug: string;
  title: string;
  excerpt: string;
  contentLocale: string;
  publicationType: ThreadPublicationType;
  publishedAt: string;
  readingMinutes: number;
  sourceCount: number;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  viewerReaction: ThreadPublicationReaction | null;
};

export type ThreadBoardMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ThreadBoardListResponse = {
  items: ThreadBoardItem[];
  meta: ThreadBoardMeta;
  didYouMean: string | null;
};

export type ThreadBoardSuggestion = {
  slug: string;
  title: string;
  publicationType: ThreadPublicationType;
  contentLocale: string;
  publishedAt: string;
  /** [start, end) offsets into `title` to highlight. */
  match: [number, number][];
};

export type ThreadBoardSuggestResponse = {
  suggestions: ThreadBoardSuggestion[];
  didYouMean: string | null;
  total: number;
  totalCapped: boolean;
};

export type ThreadBoardListParams = ThreadBoardState & { limit: ThreadBoardPageSize };

export type UseBoardSuggestResult = {
  suggestions: ThreadBoardSuggestion[];
  didYouMean: string | null;
  total: number;
  totalCapped: boolean;
  isLoading: boolean;
  isError: boolean;
};

export type UseBoardQueryStateResult = {
  state: ThreadBoardState;
  setQuery: (q: string) => void;
  setSort: (sort: ThreadBoardSort) => void;
  setLanguage: (lang: ThreadBoardLanguage) => void;
  setType: (type: ThreadBoardType) => void;
  setPage: (page: number) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
};

export type ComboboxKeyboardInput = {
  /** Number of suggestion rows (the trailing "show all" option is added by the hook). */
  optionCount: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSuggestion: (index: number) => void;
  /** Enter with no active option, or the "show all" option. */
  onSubmitQuery: () => void;
  onClear: () => void;
  hasQuery: boolean;
  listboxId: string;
};

export type ComboboxKeyboardKeyEvent = {
  key: string;
  preventDefault: () => void;
};

export type UseComboboxKeyboardResult = {
  activeIndex: number;
  /** Index of the "show all" option (always last). */
  showAllIndex: number;
  activeDescendantId: string | undefined;
  optionId: (index: number) => string;
  setActiveIndex: (index: number) => void;
  onKeyDown: (event: ComboboxKeyboardKeyEvent) => void;
};
