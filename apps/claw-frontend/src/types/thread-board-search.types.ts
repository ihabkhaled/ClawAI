import type { RefObject } from 'react';

import type {
  ThreadBoardSuggestion,
  UseBoardSuggestResult,
  UseComboboxKeyboardResult,
} from '@/types/thread-board.types';

export type BoardSuggestionItem = ThreadBoardSuggestion;
export type BoardSuggestResult = UseBoardSuggestResult;

export interface HighlightSegment {
  start: number;
  text: string;
  match: boolean;
}

export interface BoardSearchComboboxProps {
  value: string;
  /** The board's active language filter, so suggestions follow it. */
  lang: string;
  onSubmit: (q: string) => void;
}

export interface BoardSuggestionRowProps {
  id: string;
  suggestion: BoardSuggestionItem;
  /** What was typed, for the fuzzy highlight when the API sends no ranges. */
  query: string;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}

export interface BoardDidYouMeanProps {
  term: string;
  onSelect: () => void;
}

export interface HighlightedTextProps {
  text: string;
  ranges: [number, number][];
}

export interface UseBoardSearchComboboxResult {
  containerRef: RefObject<HTMLDivElement | null>;
  listId: string;
  draft: string;
  panelOpen: boolean;
  suggest: BoardSuggestResult;
  keyboard: UseComboboxKeyboardResult;
  totalLabel: string;
  setDraft: (value: string) => void;
  openPanel: () => void;
  clear: () => void;
  selectSuggestion: (index: number) => void;
  submitDraft: () => void;
  applyDidYouMean: () => void;
}
