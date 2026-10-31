import {
  THREAD_LIST_QUERY_MAX_CHARS,
  THREAD_LIST_STATUS_VALUES,
} from '@/constants/thread-list.constants';
import { ThreadListStatus } from '@/enums/thread-list-status.enum';
import type { ThreadListUrlState } from '@/types/thread-list.types';

type SearchParamsReader = { get: (name: string) => string | null };

export const DEFAULT_THREAD_LIST_STATE: ThreadListUrlState = {
  q: '',
  status: ThreadListStatus.ALL,
  page: 1,
};

/** Reads `?q=&status=&page=`; anything malformed falls back to the default rather than failing. */
export function parseThreadListUrlState(params: SearchParamsReader): ThreadListUrlState {
  const q = (params.get('q') ?? '').trim().slice(0, THREAD_LIST_QUERY_MAX_CHARS);
  const rawStatus = (params.get('status') ?? '').toUpperCase();
  const status =
    THREAD_LIST_STATUS_VALUES.find((value) => value === rawStatus) ?? ThreadListStatus.ALL;
  const rawPage = Number(params.get('page') ?? '1');
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  return { q, status, page };
}

/** The query string (with leading `?`, or empty) for a state; defaults are left out. */
export function buildThreadListSearch(state: ThreadListUrlState): string {
  const params = new URLSearchParams();
  const q = state.q.trim();
  if (q !== '') {
    params.set('q', q);
  }
  if (state.status !== ThreadListStatus.ALL) {
    params.set('status', state.status);
  }
  if (state.page > 1) {
    params.set('page', String(state.page));
  }
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
}

/** Whether a search or a status narrows the list (a bare page number does not). */
export function isThreadListFiltered(state: ThreadListUrlState): boolean {
  return state.q !== '' || state.status !== ThreadListStatus.ALL;
}

/** After a delete: the page to show so the owner is never left on an empty page past the end. */
export function pageAfterDelete(page: number, rowsOnPage: number): number {
  return rowsOnPage <= 1 && page > 1 ? page - 1 : page;
}
