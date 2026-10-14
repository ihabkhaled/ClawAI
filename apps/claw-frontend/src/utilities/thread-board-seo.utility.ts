import { THREAD_BOARD_FILTER_PARAMS } from '@/constants/thread-board-guest.constants';
import type { BoardSearchParams } from '@/types/thread-board-view.types';

function firstValue(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first === undefined ? null : first;
}

/** Adapts Next's `searchParams` object to the reader the Board URL parser expects. */
export function boardParamReader(params: BoardSearchParams): {
  get: (name: string) => string | null;
} {
  return { get: (name) => firstValue(params[name]) };
}

/**
 * Only the plain Board is indexed. A search, a filter, a sort and any page after the first are
 * views of the same Threads, so they stay out of the index (their links are still followed) and
 * the page canonical is the plain Board (rule 38: no thin or duplicate listing pages).
 */
export function isIndexableBoardView(params: BoardSearchParams): boolean {
  const hasFilter = THREAD_BOARD_FILTER_PARAMS.some((name) => firstValue(params[name]) !== null);
  const page = firstValue(params['page']);
  return !hasFilter && (page === null || page === '' || page === '1');
}
