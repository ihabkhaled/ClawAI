import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { THREAD_BOARD_SUGGEST_MIN_CHARS } from '@/constants/thread-board.constants';
import { useBoardSuggest } from '@/hooks/threads/board/use-board-suggest';
import { useComboboxKeyboard } from '@/hooks/threads/board/use-combobox-keyboard';
import type {
  BoardSearchComboboxProps,
  UseBoardSearchComboboxResult,
} from '@/types/thread-board-search.types';
import { formatBoardTotal } from '@/utilities/board-highlight.utility';

export function useBoardSearchCombobox({
  value,
  onSubmit,
}: BoardSearchComboboxProps): UseBoardSearchComboboxResult {
  const router = useRouter();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraftState] = useState(value);
  const [open, setOpen] = useState(false);
  const suggest = useBoardSuggest(draft);

  useEffect(() => setDraftState(value), [value]);

  const panelOpen = open && draft.trim().length >= THREAD_BOARD_SUGGEST_MIN_CHARS;

  const submitDraft = useCallback(() => {
    setOpen(false);
    onSubmit(draft.trim());
  }, [onSubmit, draft]);

  const clear = useCallback(() => {
    setDraftState('');
    setOpen(false);
    onSubmit('');
  }, [onSubmit]);

  const selectSuggestion = useCallback(
    (index: number) => {
      const picked = suggest.suggestions[index];
      setOpen(false);
      if (picked) {
        router.push(`/board/${picked.slug}`);
      }
    },
    [suggest.suggestions, router],
  );

  const applyDidYouMean = useCallback(() => {
    if (!suggest.didYouMean) {
      return;
    }
    setDraftState(suggest.didYouMean);
    setOpen(false);
    onSubmit(suggest.didYouMean);
  }, [suggest.didYouMean, onSubmit]);

  const keyboard = useComboboxKeyboard({
    optionCount: suggest.suggestions.length,
    isOpen: panelOpen,
    onOpenChange: setOpen,
    onSelectSuggestion: selectSuggestion,
    onSubmitQuery: submitDraft,
    onClear: clear,
    hasQuery: draft.length > 0,
    listboxId: listId,
  });

  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      const node = containerRef.current;
      if (node && event.target instanceof Node && !node.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return {
    containerRef,
    listId,
    draft,
    panelOpen,
    suggest,
    keyboard,
    totalLabel: formatBoardTotal(suggest.total, suggest.totalCapped),
    setDraft: (next) => {
      setDraftState(next);
      setOpen(true);
    },
    openPanel: () => setOpen(true),
    clear,
    selectSuggestion,
    submitDraft,
    applyDidYouMean,
  };
}
