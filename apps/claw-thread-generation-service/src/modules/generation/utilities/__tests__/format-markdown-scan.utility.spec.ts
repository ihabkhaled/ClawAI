import { describe, expect, it } from 'vitest';

import {
  containsRawHtml,
  extractUrls,
  headingsOf,
  parseHeadingLine,
} from '../format-markdown-scan.utility';

const CR = String.fromCodePoint(13);

/** Runs `work` and fails when it takes a second or more. */
function timed<T>(work: () => T): T {
  const started = performance.now();
  const result = work();
  expect(performance.now() - started).toBeLessThan(1000);
  return result;
}

describe('parseHeadingLine', () => {
  it.each([
    ['## Title ##', { level: 2, text: 'Title' }],
    ['# Title', { level: 1, text: 'Title' }],
    ['###   Spaced   words  #  ', { level: 3, text: 'Spaced   words' }],
    ['## C# #', { level: 2, text: 'C#' }],
    ['## #', { level: 2, text: '#' }],
    ['#  ', { level: 1, text: ' ' }],
  ])('reads %j', (line, heading) => {
    expect(parseHeadingLine(line)).toEqual(heading);
  });

  it.each(['####### seven', '#nospace', 'plain', '# ', `# a${CR}b`])(
    'returns null for %j, as the regex did',
    (line) => {
      expect(parseHeadingLine(line)).toBeNull();
    },
  );

  it('feeds headingsOf outside code fences only', () => {
    expect(headingsOf('# One\n```\n# not\n```\n## Two')).toEqual([
      { level: 1, text: 'One' },
      { level: 2, text: 'Two' },
    ]);
  });

  // CodeQL js/polynomial-redos: the line is scanned, not matched by a lazy regex.
  it('stays linear on 50,000 blanks inside a heading', () => {
    const line = `# a${' \t'.repeat(50_000)}b`;
    expect(timed(() => parseHeadingLine(line))).toEqual({ level: 1, text: line.slice(2) });
  });
});

describe('extractUrls', () => {
  it('drops the punctuation that ends a sentence after a url', () => {
    expect(extractUrls('See https://a.test/x.,;!? and (http://b.test/y).')).toEqual([
      'https://a.test/x',
      'http://b.test/y',
    ]);
  });

  it('stays linear on 50,000 dots inside a url', () => {
    const url = `https://a.test/${'.'.repeat(50_000)}x`;
    expect(timed(() => extractUrls(`${url}.`))).toEqual([url]);
  });
});

describe('containsRawHtml', () => {
  it.each([
    ['<b>bold</b>', true],
    ['a </p> b', true],
    ['<img src="x"\n>', true],
    ['a < b > c', false],
    ['<1>', false],
    ['</ p>', false],
    ['<b', false],
    ['> <b', false],
  ])('%j -> %s', (text, expected) => {
    expect(containsRawHtml(text)).toBe(expected);
  });

  it('stays linear on 50,000 unclosed tags', () => {
    expect(timed(() => containsRawHtml('<a'.repeat(50_000)))).toBe(false);
  });
});
