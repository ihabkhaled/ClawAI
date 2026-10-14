import {
  THREAD_BOARD_ALL,
  THREAD_BOARD_DEFAULT_SORT,
  THREAD_BOARD_SORTS,
  THREAD_BOARD_TYPES,
} from '@/constants/thread-board.constants';
import { THREAD_PUBLICATION_OPTIONS } from '@/constants/thread-publication.constants';
import { BoardChipKind } from '@/enums/board-chip-kind.enum';
import type { Locale } from '@/enums/locale.enum';
import { ThreadBoardMode } from '@/enums/thread-board-mode.enum';
import type { ThreadBoardSort } from '@/enums/thread-board-sort.enum';
import type { TranslateFunction } from '@/types/i18n.types';
import type { BoardChip, BoardChipInput } from '@/types/thread-board-view.types';
import type { ThreadBoardType } from '@/types/thread-board.types';
import { localisePath } from '@/utilities/locale.utility';
import { encodeThreadSlug } from '@/utilities/thread-slug.utility';

/** A language's own name ("Deutsch"); falls back to the code if Intl cannot name it. */
export function boardLanguageLabel(code: string): string {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function boardTypeLabelKey(type: string): string | null {
  const match = THREAD_PUBLICATION_OPTIONS.find((option) => String(option.value) === type);
  return match ? match.translationKey : null;
}

/** Select hands back a string; narrow it to a known sort, never cast. */
export function toBoardSort(value: string): ThreadBoardSort {
  return THREAD_BOARD_SORTS.find((sort) => sort === value) ?? THREAD_BOARD_DEFAULT_SORT;
}

export function toBoardType(value: string): ThreadBoardType {
  return THREAD_BOARD_TYPES.find((type) => type === value) ?? THREAD_BOARD_ALL;
}

export function countBoardFilters(values: { lang: string; type: string }): number {
  return (values.lang !== THREAD_BOARD_ALL ? 1 : 0) + (values.type !== THREAD_BOARD_ALL ? 1 : 0);
}

export function buildBoardChips(input: BoardChipInput, t: TranslateFunction): BoardChip[] {
  const chips: BoardChip[] = [];
  if (input.q.trim() !== '') {
    chips.push({ kind: BoardChipKind.Query, label: `"${input.q.trim()}"` });
  }
  if (input.lang !== THREAD_BOARD_ALL) {
    chips.push({ kind: BoardChipKind.Language, label: boardLanguageLabel(input.lang) });
  }
  if (input.type !== THREAD_BOARD_ALL) {
    const key = boardTypeLabelKey(input.type);
    chips.push({ kind: BoardChipKind.Type, label: key ? t(key) : input.type });
  }
  return chips;
}

export function boardItemPath(slug: string): string {
  return `/board/${encodeThreadSlug(slug)}`;
}

/**
 * Where a Board item opens. Members read it in the portal; a guest opens the public Thread page,
 * in their language, which is also the canonical address of every Thread.
 */
export function boardItemHref(mode: ThreadBoardMode, slug: string, locale: Locale): string {
  return mode === ThreadBoardMode.Guest
    ? localisePath(`/threads/${encodeThreadSlug(slug)}`, locale)
    : boardItemPath(slug);
}
