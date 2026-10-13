import { describe, expect, it } from 'vitest';

import { htmlTableToMarkdown } from '@/utilities/clipboard-table.utility';

describe('htmlTableToMarkdown', () => {
  it('turns a table into a markdown table with a header separator', () => {
    const html =
      '<table><tr><th>#</th><th>Item</th></tr><tr><td>1</td><td>Consent</td></tr></table>';
    expect(htmlTableToMarkdown(html)).toBe('| # | Item |\n| --- | --- |\n| 1 | Consent |');
  });

  it('escapes pipes and collapses whitespace inside a cell', () => {
    const html = '<table><tr><td>a | b\n  c</td></tr></table>';
    expect(htmlTableToMarkdown(html)).toBe('| a \\| b c |\n| --- |');
  });

  it('pads short rows to the widest row', () => {
    const html = '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td></tr></table>';
    expect(htmlTableToMarkdown(html)).toBe('| a | b |\n| --- | --- |\n| c |  |');
  });

  it('ignores Excel style blocks around the table', () => {
    const html =
      '<html><head><style>td{x:y}</style></head><body><table><tr><td>a</td></tr></table></body></html>';
    expect(htmlTableToMarkdown(html)).toBe('| a |\n| --- |');
  });

  it('returns null when there is no table', () => {
    expect(htmlTableToMarkdown('<p>hello</p>')).toBeNull();
    expect(htmlTableToMarkdown('')).toBeNull();
  });

  it('returns null when text sits outside the table', () => {
    expect(htmlTableToMarkdown('<p>intro</p><table><tr><td>a</td></tr></table>')).toBeNull();
  });

  it('returns null for more than one table', () => {
    const html = '<table><tr><td>a</td></tr></table><table><tr><td>b</td></tr></table>';
    expect(htmlTableToMarkdown(html)).toBeNull();
  });
});
