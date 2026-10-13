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
  onSubmit: (q: string) => void;
}

export interface BoardSuggestionRowProps {
  id: string;
  suggestion: BoardSuggestionItem;
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
