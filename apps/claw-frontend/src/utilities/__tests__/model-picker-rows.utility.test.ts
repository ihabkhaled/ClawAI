import { describe, expect, it } from 'vitest';

import type { ModelPickerGroup, ModelPickerRow } from '@/types';
import {
  buildModelPickerRows,
  edgeOptionRow,
  findOptionRowIndex,
  stepOptionRow,
} from '@/utilities/model-picker-rows.utility';

const groups: ModelPickerGroup[] = [
  {
    key: 'A',
    label: 'Alpha Lab',
    options: [
      { value: 'A::one', label: 'One' },
      { value: 'A::two', label: 'Two' },
    ],
  },
  { key: 'B', label: 'Beta', options: [{ value: 'B::three', label: 'Three' }] },
];

describe('buildModelPickerRows', () => {
  it('flattens groups into headings and options, auto option first', () => {
    const rows = buildModelPickerRows(groups, { value: '__auto__', label: 'Auto' }, '');

    expect(rows.map((row) => (row.kind === 'group' ? `#${row.label}` : row.option.label))).toEqual([
      'Auto',
      '#Alpha Lab',
      'One',
      'Two',
      '#Beta',
      'Three',
    ]);
  });

  it('drops a group and its heading when nothing in it matches', () => {
    const rows = buildModelPickerRows(groups, undefined, 'three');

    expect(rows.filter((row) => row.kind === 'group')).toHaveLength(1);
    expect(rows).toHaveLength(2);
  });

  it('matches every word against label, id and provider name, ignoring case', () => {
    expect(buildModelPickerRows(groups, undefined, 'ALPHA two')).toHaveLength(2);
    expect(buildModelPickerRows(groups, undefined, 'alpha three')).toHaveLength(0);
    expect(buildModelPickerRows(groups, undefined, 'a::one')).toHaveLength(2);
  });

  it('leaves out the heading of an unlabelled group', () => {
    const rows = buildModelPickerRows(
      [{ key: 'X', label: '', options: groups[0]!.options }],
      undefined,
      '',
    );

    expect(rows.every((row) => row.kind === 'option')).toBe(true);
  });

  it('handles 1,000 models', () => {
    const big: ModelPickerGroup[] = [
      {
        key: 'BIG',
        label: 'Big',
        options: Array.from({ length: 1000 }, (_unused, index) => ({
          value: `BIG::m${String(index)}`,
          label: `m${String(index)}`,
        })),
      },
    ];

    expect(buildModelPickerRows(big, undefined, '')).toHaveLength(1001);
    expect(buildModelPickerRows(big, undefined, 'm999')).toHaveLength(2);
  });
});

describe('option navigation', () => {
  const rows: ModelPickerRow[] = buildModelPickerRows(groups, undefined, '');

  it('finds an option row and reports -1 for an unknown value', () => {
    expect(findOptionRowIndex(rows, 'A::two')).toBe(2);
    expect(findOptionRowIndex(rows, 'nope')).toBe(-1);
  });

  it('steps over group headings and wraps at both ends', () => {
    expect(stepOptionRow(rows, 2, 1)).toBe(4);
    expect(stepOptionRow(rows, 4, 1)).toBe(1);
    expect(stepOptionRow(rows, 1, -1)).toBe(4);
    expect(stepOptionRow(rows, -1, 1)).toBe(1);
    expect(stepOptionRow([], 0, 1)).toBe(-1);
  });

  it('finds the first and last option', () => {
    expect(edgeOptionRow(rows, 'first')).toBe(1);
    expect(edgeOptionRow(rows, 'last')).toBe(4);
    expect(edgeOptionRow([], 'first')).toBe(-1);
  });
});
