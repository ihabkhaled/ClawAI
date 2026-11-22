import { describe, expect, it } from 'vitest';

import { parseNestPrettyLine } from '../nest-pretty-line.utility';

describe('parseNestPrettyLine', () => {
  it('reads the level, the context and the message', () => {
    expect(
      parseNestPrettyLine('[Nest] 1  - 09/19/2026, 9:02:37 AM   WARN [ChatManager] slow reply'),
    ).toEqual({ word: 'WARN', context: 'ChatManager', message: 'slow reply' });
  });

  it('keeps a multi-line message whole', () => {
    expect(parseNestPrettyLine('[Nest] 7 - x ERROR [Boot] failed\n  at main')).toEqual({
      word: 'ERROR',
      context: 'Boot',
      message: 'failed\n  at main',
    });
  });

  it('skips a level word whose context is not followed by a blank', () => {
    expect(parseNestPrettyLine('[Nest] 1 - a LOG [x]y DEBUG [Real] text')).toEqual({
      word: 'DEBUG',
      context: 'Real',
      message: 'text',
    });
  });

  it.each([
    '[Nest] 1 - WARN [C] one blank after the dash is not enough',
    '[Nest] 1 - x LOGGER [C] m',
    '[Nest] 1 - x LOG [] m',
    '[Nest] 1 - x LOG [C',
    'not a nest line',
  ])('returns null for %j, as the regex did', (line) => {
    expect(parseNestPrettyLine(line)).toBeNull();
  });

  it('accepts a level right after the dash when two blanks precede it', () => {
    expect(parseNestPrettyLine('[Nest] 1 -  WARN [C] m')).toEqual({
      word: 'WARN',
      context: 'C',
      message: 'm',
    });
  });

  // CodeQL js/polynomial-redos: the line is scanned once, not matched by a lazy regex.
  it.each([
    ['50,000 tabs after the dash', `[Nest]\t0\t-\t${'\t'.repeat(50_000)}`],
    ['50,000 unclosed contexts', `[Nest] 1 - ${' LOG [x'.repeat(50_000)}`],
  ])('stays linear on %s', (_label, line) => {
    const started = performance.now();
    const parts = parseNestPrettyLine(line);

    expect(performance.now() - started).toBeLessThan(1000);
    expect(parts).toBeNull();
  });
});
