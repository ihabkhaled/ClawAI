import { Locale } from '@/enums/locale.enum';
import { ThreadBoardSort } from '@/enums/thread-board-sort.enum';

export const BOARD_SORT_OPTIONS = [
  { value: ThreadBoardSort.Latest, translationKey: 'chat.threadBoardSortLatest' },
  { value: ThreadBoardSort.Trending, translationKey: 'chat.threadBoardSortTrending' },
  { value: ThreadBoardSort.Discussed, translationKey: 'chat.threadBoardSortDiscussed' },
  { value: ThreadBoardSort.Liked, translationKey: 'chat.threadBoardSortLiked' },
] as const;

export const BOARD_LANGUAGE_CODES: readonly string[] = Object.values(Locale);

export const BOARD_SKELETON_COUNT = 6;
