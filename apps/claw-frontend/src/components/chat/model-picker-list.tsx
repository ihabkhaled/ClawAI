import { Search } from 'lucide-react';

import {
  MODEL_PICKER_LISTBOX_ID,
  MODEL_PICKER_OVERSCAN_PX,
} from '@/constants/model-picker.constants';
import { useModelPickerList } from '@/hooks/chat/use-model-picker-list';
import { Virtuoso } from '@/lib/virtuoso';
import type { ModelPickerListProps } from '@/types';
import { modelPickerRowKey } from '@/utilities/model-picker-rows.utility';

/**
 * The searchable, virtualised model list. The catalogue can run to 800+ models;
 * mounting a row per model made opening and typing lag, so only the rows near
 * the viewport exist in the DOM.
 */
export function ModelPickerList({
  groups,
  autoOption,
  value,
  highlightedValue,
  onHighlightChange,
  onSelect,
  isMobile,
  searchPlaceholder,
  noResultsLabel,
}: ModelPickerListProps): React.ReactElement {
  const list = useModelPickerList({
    groups,
    autoOption,
    value,
    highlightedValue,
    onHighlightChange,
    onSelect,
    isMobile,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-11 shrink-0 items-center gap-2 border-b px-3">
        <Search className="h-4 w-4 shrink-0 opacity-50" />
        <input
          type="text"
          ref={list.inputRef}
          value={list.query}
          onChange={(event) => list.onQueryChange(event.target.value)}
          onKeyDown={list.onKeyDown}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          aria-controls={MODEL_PICKER_LISTBOX_ID}
          aria-activedescendant={
            highlightedValue === undefined ? undefined : `${MODEL_PICKER_LISTBOX_ID}-active`
          }
          autoComplete="off"
          className="placeholder:text-muted-foreground touch:h-11 touch:text-base flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none"
        />
      </div>
      {list.hasOptions ? (
        <div
          id={MODEL_PICKER_LISTBOX_ID}
          role="listbox"
          data-testid="model-picker-list"
          className="p-1"
        >
          <Virtuoso
            ref={list.listRef}
            style={{ height: list.listHeight }}
            data={list.rows}
            computeItemKey={modelPickerRowKey}
            increaseViewportBy={MODEL_PICKER_OVERSCAN_PX}
            initialTopMostItemIndex={{ index: list.initialRowIndex, align: 'center' }}
            itemContent={list.itemContent}
          />
        </div>
      ) : (
        <p role="status" className="py-6 text-center text-sm">
          {noResultsLabel}
        </p>
      )}
    </div>
  );
}
