import { useCallback, useEffect, useState } from 'react';

import type {
  ComboboxKeyboardInput,
  ComboboxKeyboardKeyEvent,
  UseComboboxKeyboardResult,
} from '@/types/thread-board.types';

/** ARIA 1.2 combobox with a listbox popup; DOM focus stays in the input. */
export function useComboboxKeyboard(input: ComboboxKeyboardInput): UseComboboxKeyboardResult {
  const { optionCount, isOpen, onOpenChange, onSelectSuggestion, onSubmitQuery, onClear } = input;
  const { hasQuery, listboxId } = input;
  const [activeIndex, setActiveIndex] = useState(-1);
  // Suggestions plus the trailing "show all" option.
  const total = optionCount + 1;
  const showAllIndex = optionCount;

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [optionCount]);

  const optionId = useCallback((index: number) => `${listboxId}-option-${index}`, [listboxId]);

  const onKeyDown = useCallback(
    (event: ComboboxKeyboardKeyEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            onOpenChange(true);
            setActiveIndex(0);
          } else {
            setActiveIndex((current) => (current + 1) % total);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (!isOpen) {
            onOpenChange(true);
            setActiveIndex(total - 1);
          } else {
            setActiveIndex((current) => (current <= 0 ? total - 1 : current - 1));
          }
          break;
        case 'Home':
          if (isOpen) {
            event.preventDefault();
            setActiveIndex(0);
          }
          break;
        case 'End':
          if (isOpen) {
            event.preventDefault();
            setActiveIndex(total - 1);
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (isOpen && activeIndex >= 0 && activeIndex < optionCount) {
            onSelectSuggestion(activeIndex);
          } else {
            onSubmitQuery();
          }
          onOpenChange(false);
          break;
        case 'Escape':
          if (isOpen) {
            event.preventDefault();
            onOpenChange(false);
          } else if (hasQuery) {
            event.preventDefault();
            onClear();
          }
          break;
        case 'Tab':
          if (isOpen) {
            onOpenChange(false);
          }
          break;
        default:
          break;
      }
    },
    [
      activeIndex,
      hasQuery,
      isOpen,
      onClear,
      onOpenChange,
      onSelectSuggestion,
      onSubmitQuery,
      optionCount,
      total,
    ],
  );

  return {
    activeIndex,
    showAllIndex,
    activeDescendantId: isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined,
    optionId,
    setActiveIndex,
    onKeyDown,
  };
}
