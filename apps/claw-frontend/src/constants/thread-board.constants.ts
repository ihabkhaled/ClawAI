import { ThreadPublicationType } from '@claw/shared-types';

import { ThreadBoardAllFilter } from '@/enums/thread-board-all-filter.enum';
import { ThreadBoardSort } from '@/enums/thread-board-sort.enum';
import type { ThreadBoardPageSize } from '@/types/thread-board.types';

export const THREAD_BOARD_QUERY_KEY = 'thread-board';
export const THREAD_BOARD_ALL = ThreadBoardAllFilter.All;
export const THREAD_BOARD_SORTS: ReadonlyArray<ThreadBoardSort> = Object.values(ThreadBoardSort);
export const THREAD_BOARD_DEFAULT_SORT = ThreadBoardSort.Latest;
export const THREAD_BOARD_PAGE_SIZES: ReadonlyArray<ThreadBoardPageSize> = [12, 24, 48];
export const THREAD_BOARD_DEFAULT_PAGE_SIZE: ThreadBoardPageSize = 12;
export const THREAD_BOARD_MAX_PAGE = 1000;
export const THREAD_BOARD_MAX_QUERY_LENGTH = 200;
export const THREAD_BOARD_TYPES: ReadonlyArray<ThreadPublicationType> =
  Object.values(ThreadPublicationType);
export const THREAD_BOARD_SUGGEST_DEBOUNCE_MS = 200;
export const THREAD_BOARD_SUGGEST_MIN_CHARS = 2;
export const THREAD_BOARD_SUGGEST_STALE_MS = 30_000;
export const THREAD_BOARD_LIST_STALE_MS = 30_000;
