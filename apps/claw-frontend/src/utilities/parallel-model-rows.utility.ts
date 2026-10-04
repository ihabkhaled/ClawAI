import type { GroupedModels, ParallelModelRow } from '@/types';

/** Image generators are not chat targets for Compare. */
const NON_CHAT_PROVIDER_PREFIX = 'IMAGE_';

/**
 * Flattens the catalogue into heading and model rows for the virtualised
 * Compare list, keeping only models whose name contains the search text.
 */
export function buildParallelModelRows(
  groups: readonly GroupedModels[],
  query: string,
): ParallelModelRow[] {
  const needle = query.trim().toLowerCase();
  const rows: ParallelModelRow[] = [];
  for (const group of groups) {
    if (group.provider.startsWith(NON_CHAT_PROVIDER_PREFIX)) {
      continue;
    }
    const models =
      needle === ''
        ? group.models
        : group.models.filter((model) => model.displayName.toLowerCase().includes(needle));
    if (models.length === 0) {
      continue;
    }
    rows.push({ kind: 'group', key: group.provider, label: group.label });
    for (const model of models) {
      rows.push({ kind: 'model', model });
    }
  }
  return rows;
}

/** Stable Virtuoso key for a row. */
export function parallelModelRowKey(_index: number, row: ParallelModelRow): string {
  return row.kind === 'group'
    ? `group:${row.key}`
    : `model:${row.model.provider}:${row.model.model}`;
}
