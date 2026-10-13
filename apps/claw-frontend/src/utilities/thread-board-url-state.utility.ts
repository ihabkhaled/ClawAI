import {
  THREAD_BOARD_ALL,
  THREAD_BOARD_DEFAULT_SORT,
  THREAD_BOARD_MAX_PAGE,
  THREAD_BOARD_MAX_QUERY_LENGTH,
  THREAD_BOARD_SORTS,
  THREAD_BOARD_TYPES,
} from '@/constants/thread-board.constants';
import type { ThreadBoardSort } from '@/enums/thread-board-sort.enum';
import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';
import type { ThreadBoardState, ThreadBoardType } from '@/types/thread-board.types';

type ParamReader = { get: (name: string) => string | null };

const LOCALE_CODES: ReadonlyArray<string> = SUPPORTED_LOCALES.map((entry) => entry.locale);

export function isBoardSort(value: string | null): value is ThreadBoardSort {
  return THREAD_BOARD_SORTS.some((sort) => sort === value);
}

function parseType(value: string | null): ThreadBoardType {
  const match = THREAD_BOARD_TYPES.find((type) => type === value);
  return match ?? THREAD_BOARD_ALL;
}

function parseLang(value: string | null, defaultLang: string): string {
  if (value === THREAD_BOARD_ALL) {
    return THREAD_BOARD_ALL;
  }
  if (value !== null && LOCALE_CODES.includes(value)) {
    return value;
  }
  return defaultLang;
}

export function clampBoardPage(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(THREAD_BOARD_MAX_PAGE, Math.max(1, Math.trunc(value)));
}

function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) {
    return 1;
  }
  return clampBoardPage(Number(value));
}

/** Strict parse: anything unknown falls back to its default. */
export function parseBoardUrlState(params: ParamReader, defaultLang: string): ThreadBoardState {
  const sort = params.get('sort');
  return {
    q: (params.get('q') ?? '').trim().slice(0, THREAD_BOARD_MAX_QUERY_LENGTH),
    sort: isBoardSort(sort) ? sort : THREAD_BOARD_DEFAULT_SORT,
    lang: parseLang(params.get('lang'), defaultLang),
    type: parseType(params.get('type')),
    page: parsePage(params.get('page')),
  };
}

/** Omits defaults so the canonical URL stays short. */
export function serialiseBoardUrlState(state: ThreadBoardState, defaultLang: string): string {
  const out = new URLSearchParams();
  const q = state.q.trim().slice(0, THREAD_BOARD_MAX_QUERY_LENGTH);
  if (q) {
    out.set('q', q);
  }
  if (state.sort !== THREAD_BOARD_DEFAULT_SORT) {
    out.set('sort', state.sort);
  }
  if (state.lang !== defaultLang) {
    out.set('lang', state.lang);
  }
  if (state.type !== THREAD_BOARD_ALL) {
    out.set('type', state.type);
  }
  const page = clampBoardPage(state.page);
  if (page > 1) {
    out.set('page', String(page));
  }
  return out.toString();
}

/** True when the user has narrowed the list beyond the defaults (sort excluded). */
export function hasActiveBoardFilters(state: ThreadBoardState, defaultLang: string): boolean {
  return state.q !== '' || state.lang !== defaultLang || state.type !== THREAD_BOARD_ALL;
}
