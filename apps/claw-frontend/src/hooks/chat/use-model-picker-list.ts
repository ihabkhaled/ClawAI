import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import { ModelPickerRowView } from '@/components/chat/model-picker-row';
import {
  MODEL_PICKER_AVAILABLE_HEIGHT,
  MODEL_PICKER_CHROME_HEIGHT,
  MODEL_PICKER_LIST_MAX_HEIGHT_PX,
  MODEL_PICKER_MOBILE_LIST_HEIGHT,
  MODEL_PICKER_ROW_HEIGHT_PX,
} from '@/constants/model-picker.constants';
import type { VirtuosoHandle } from '@/lib/virtuoso';
import type { ModelPickerRow, UseModelPickerListParams, UseModelPickerListResult } from '@/types';
import {
  buildModelPickerRows,
  edgeOptionRow,
  findOptionRowIndex,
  stepOptionRow,
} from '@/utilities/model-picker-rows.utility';

/**
 * Search, keyboard and scroll control for the virtualised model list.
 *
 * Only the rows near the viewport are in the DOM, so cmdk (which walks mounted
 * items) cannot drive the keyboard here. The highlight is a model value owned
 * by the picker; arrow keys move it across the FULL filtered list and ask
 * Virtuoso to scroll the row into view, whether or not it is mounted yet.
 */
export function useModelPickerList({
  groups,
  autoOption,
  value,
  highlightedValue,
  onHighlightChange,
  onSelect,
  isMobile,
}: UseModelPickerListParams): UseModelPickerListResult {
  const [query, setQuery] = useState('');
  const listRef = useRef<VirtuosoHandle | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Typing is the first thing a user does with a model list.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const rows = useMemo(
    () => buildModelPickerRows(groups, autoOption, query),
    [groups, autoOption, query],
  );
  // The list mounts when the picker opens, so this opens it at the current choice.
  const [initialRowIndex] = useState(() =>
    Math.max(
      findOptionRowIndex(buildModelPickerRows(groups, autoOption, ''), value ?? undefined),
      0,
    ),
  );
  const activeRowIndex = findOptionRowIndex(rows, highlightedValue);
  const hasOptions = rows.some((row) => row.kind === 'option');

  const moveTo = (nextRows: typeof rows, index: number): void => {
    const row = nextRows[index];
    if (row?.kind !== 'option') {
      return;
    }
    onHighlightChange(row.option.value);
    listRef.current?.scrollIntoView({ index, behavior: 'auto' });
  };

  const onQueryChange = (nextQuery: string): void => {
    setQuery(nextQuery);
    const nextRows = buildModelPickerRows(groups, autoOption, nextQuery);
    moveTo(nextRows, edgeOptionRow(nextRows, 'first'));
    listRef.current?.scrollToIndex({ index: 0, align: 'start' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveTo(rows, stepOptionRow(rows, activeRowIndex, 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveTo(rows, stepOptionRow(rows, activeRowIndex, -1));
        break;
      case 'Home':
        event.preventDefault();
        moveTo(rows, edgeOptionRow(rows, 'first'));
        break;
      case 'End':
        event.preventDefault();
        moveTo(rows, edgeOptionRow(rows, 'last'));
        break;
      case 'Enter': {
        event.preventDefault();
        const row = rows[activeRowIndex];
        if (row?.kind === 'option') {
          onSelect(row.option.value);
        }
        break;
      }
      default:
        break;
    }
  };

  // Built here (not inline in the view) so the row is a stable component type.
  const itemContent = (index: number, row: ModelPickerRow): ReactNode =>
    createElement(ModelPickerRowView, {
      row,
      isActive: index === activeRowIndex,
      isSelected: row.kind === 'option' && row.option.value === value,
      onSelect,
      onHover: onHighlightChange,
    });

  const naturalHeightPx = Math.min(
    rows.length * MODEL_PICKER_ROW_HEIGHT_PX,
    MODEL_PICKER_LIST_MAX_HEIGHT_PX,
  );
  const listHeight = isMobile
    ? MODEL_PICKER_MOBILE_LIST_HEIGHT
    : `min(${String(naturalHeightPx)}px, calc(${MODEL_PICKER_AVAILABLE_HEIGHT} - ${MODEL_PICKER_CHROME_HEIGHT}))`;

  return {
    query,
    onQueryChange,
    rows,
    hasOptions,
    activeRowIndex,
    initialRowIndex,
    listRef,
    inputRef,
    itemContent,
    listHeight,
    onKeyDown,
  };
}
