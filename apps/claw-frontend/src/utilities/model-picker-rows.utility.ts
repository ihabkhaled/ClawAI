import type { ModelPickerGroup, ModelPickerOption, ModelPickerRow } from '@/types';

/** Every word typed must appear in the model's label, id or provider name. */
function matchesQuery(option: ModelPickerOption, groupLabel: string, words: string[]): boolean {
  const haystack = `${option.label} ${option.value} ${groupLabel}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/**
 * Flattens the picker's groups into one list of rows (group headings and
 * options) so a virtualised list can window over it. A group with no matching
 * option disappears with its heading.
 */
export function buildModelPickerRows(
  groups: readonly ModelPickerGroup[],
  autoOption: ModelPickerOption | undefined,
  query: string,
): ModelPickerRow[] {
  const words = query.toLowerCase().split(/\s+/u).filter(Boolean);
  const rows: ModelPickerRow[] = [];
  if (autoOption !== undefined && matchesQuery(autoOption, '', words)) {
    rows.push({ kind: 'option', option: autoOption });
  }
  for (const group of groups) {
    const options = group.options.filter((option) => matchesQuery(option, group.label, words));
    if (options.length === 0) {
      continue;
    }
    if (group.label.length > 0) {
      rows.push({ kind: 'group', key: group.key, label: group.label });
    }
    for (const option of options) {
      rows.push({ kind: 'option', option });
    }
  }
  return rows;
}

/** Row index of the option with this value, or -1. */
export function findOptionRowIndex(
  rows: readonly ModelPickerRow[],
  value: string | undefined,
): number {
  return rows.findIndex((row) => row.kind === 'option' && row.option.value === value);
}

/**
 * The next option row from `from` in `direction`, skipping group headings and
 * wrapping at either end. `from` of -1 starts from the matching edge.
 */
export function stepOptionRow(
  rows: readonly ModelPickerRow[],
  from: number,
  direction: 1 | -1,
): number {
  if (rows.length === 0) {
    return -1;
  }
  let index = from;
  for (let step = 0; step < rows.length; step += 1) {
    index = (index + direction + rows.length) % rows.length;
    if (rows[index]?.kind === 'option') {
      return index;
    }
  }
  return -1;
}

/** First or last option row. */
export function edgeOptionRow(rows: readonly ModelPickerRow[], edge: 'first' | 'last'): number {
  const indexes = rows.flatMap((row, index) => (row.kind === 'option' ? [index] : []));
  return (edge === 'first' ? indexes[0] : indexes.at(-1)) ?? -1;
}

/** Stable Virtuoso key for a row. */
export function modelPickerRowKey(_index: number, row: ModelPickerRow): string {
  return row.kind === 'group' ? `group:${row.key}` : `option:${row.option.value}`;
}
