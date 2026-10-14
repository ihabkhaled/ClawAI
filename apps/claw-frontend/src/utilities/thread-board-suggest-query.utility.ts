import { THREAD_BOARD_MAX_QUERY_LENGTH } from '@/constants/thread-board.constants';

/** Trims and clamps a suggest query to the API's maximum so it never answers 400. */
export function normalizeSuggestQuery(rawQuery: string): string {
  return rawQuery.trim().slice(0, THREAD_BOARD_MAX_QUERY_LENGTH).trim();
}
