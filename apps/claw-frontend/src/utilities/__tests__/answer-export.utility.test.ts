import { describe, expect, it } from 'vitest';

import { answerTitle, markdownToPlainText, safeFileBase } from '@/utilities/answer-export.utility';

const BACKSLASH = String.fromCharCode(92);
const BELL = String.fromCharCode(7);

describe('answer export utility', () => {
  it('titles an answer by its first heading, else its first line', () => {
    expect(answerTitle('Intro text\n\n## **Quarterly** plan\n\nbody')).toBe('Quarterly plan');
    expect(answerTitle('Just a sentence with `code`.\nMore')).toBe('Just a sentence with code.');
    expect(answerTitle('')).toBe('answer');
    expect(answerTitle('x'.repeat(200)).length).toBe(60);
  });

  // The title becomes a filename on the user's device.
  it.each([
    ['Plan: Q3/Q4 <draft>', 'Plan Q3 Q4 draft'],
    [`a${BACKSLASH}b|c?d*e"f`, 'a b c d e f'],
    [`tab\there${BELL}bell`, 'tab here bell'],
    ['   ', 'answer'],
    ['line\nbreak', 'line break'],
    // A first line ends mid-sentence; Windows refuses a trailing dot or space.
    ["A canvas vast, of MAROON-3910's hue,", "A canvas vast, of MAROON-3910's hue"],
    ['Just a sentence with code.', 'Just a sentence with code'],
    ['Wait... ', 'Wait'],
    ['Plan - ', 'Plan'],
    ['...', 'answer'],
  ])('makes %j a safe file base', (title, expected) => {
    expect(safeFileBase(title)).toBe(expected);
  });

  it('turns markdown into readable text', () => {
    const md =
      '# Title\n\nSome **bold**, _em_ and `code`.\n\n- one\n- two\n\n[link](https://x.io) ![img](a.png)\n\n| a | b |\n|---|:---:|\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```';
    const text = markdownToPlainText(md);
    expect(text).toContain('Title');
    expect(text).toContain('Some bold, em and code.');
    expect(text).toContain('• one');
    expect(text).toContain('link (https://x.io)');
    expect(text).toContain('const x = 1;');
    expect(text).not.toMatch(/[#*`|]/u);
    expect(text).not.toContain('---');
  });

  // A pathological table row must not hang the browser (the old regex nested
  // quantifiers and could backtrack for a very long time).
  it('handles a long near-separator line quickly', () => {
    const line = `|${'-:'.repeat(5_000)}x`;
    const started = performance.now();
    markdownToPlainText(line);
    expect(performance.now() - started).toBeLessThan(200);
  });
});
