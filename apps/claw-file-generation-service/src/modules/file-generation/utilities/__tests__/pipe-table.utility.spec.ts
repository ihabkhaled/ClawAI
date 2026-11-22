import { describe, expect, it } from 'vitest';

import { repairPipeTables } from '../pipe-table.utility';

describe('repairPipeTables', () => {
  it('adds the missing separator row under a header', () => {
    expect(repairPipeTables('| a | b |\n| 1 | 2 |')).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |');
  });

  it.each([
    '| a | b |\n|:---|---:|\n| 1 | 2 |',
    '| a |\n|\t---\t|\n| 1 |',
    'a | b\n---|---\n1 | 2',
    '```\n| a |\n| 1 |\n```',
  ])('leaves %j as it is', (markdown) => {
    expect(repairPipeTables(markdown)).toBe(markdown);
  });

  it('treats a row with an empty cell as data, not a separator', () => {
    expect(repairPipeTables('| a | b |\n|---||---|')).toBe('| a | b |\n| --- | --- |\n|---||---|');
  });

  // CodeQL js/polynomial-redos: the separator row is split on `|`, not matched by one regex.
  it('stays linear on a row of 50,000 tabs', () => {
    const row = `|${'\t'.repeat(50_000)}x|`;
    const started = performance.now();
    const output = repairPipeTables(`| a |\n${row}`);

    expect(performance.now() - started).toBeLessThan(1000);
    expect(output).toBe(`| a |\n| --- |\n${row}`);
  });
});
