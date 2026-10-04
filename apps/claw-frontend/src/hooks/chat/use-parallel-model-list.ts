import { createElement, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { ParallelModelRowView } from '@/components/chat/parallel-model-row';
import { MAX_PARALLEL_MODELS } from '@/constants';
import type {
  ParallelModelRow,
  UseParallelModelListParams,
  UseParallelModelListResult,
} from '@/types';
import { buildParallelModelRows } from '@/utilities/parallel-model-rows.utility';

/** Search, rows and row rendering for the virtualised Compare model list. */
export function useParallelModelList({
  groupedModels,
  selectedModels,
  onToggleModel,
}: UseParallelModelListParams): UseParallelModelListResult {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => buildParallelModelRows(groupedModels, query), [groupedModels, query]);
  const isMaxReached = selectedModels.length >= MAX_PARALLEL_MODELS;

  // Built here (not inline in the view) so the row is a stable component type.
  const itemContent = (_index: number, row: ParallelModelRow): ReactNode => {
    const isChecked =
      row.kind === 'model' &&
      selectedModels.some(
        (selected) =>
          selected.provider === row.model.provider && selected.model === row.model.model,
      );
    return createElement(ParallelModelRowView, {
      row,
      isChecked,
      isDisabled: !isChecked && isMaxReached,
      onToggle: onToggleModel,
    });
  };

  return {
    query,
    setQuery,
    rows,
    hasNoSearchResults: query.trim() !== '' && rows.length === 0,
    itemContent,
  };
}
