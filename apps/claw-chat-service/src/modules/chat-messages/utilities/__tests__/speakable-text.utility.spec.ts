import { describe, expect, it } from 'vitest';

import {
  capSpeakableText,
  prepareSpeakableText,
  speechCharacterCount,
  toSpeakableText,
} from '../speakable-text.utility';

// Multimodal batch 9 — what a voice says for a Markdown reply.
describe('toSpeakableText', () => {
  it.each([
    ['plain text is unchanged', 'Hello there.', 'Hello there.'],
    [
      'bold and italic markers go',
      'This is **bold** and *italic* and __strong__.',
      'This is bold and italic and strong.',
    ],
    ['heading markers go', '## Results\n\nIt worked.', 'Results\n\nIt worked.'],
    ['list markers go, items stay', '- first\n- second\n1. third', 'first second third'],
    ['blockquote markers go', '> quoted words', 'quoted words'],
    ['inline code keeps its words', 'Run `npm test` now.', 'Run npm test now.'],
    [
      'a link keeps its text',
      'See [the docs](https://example.com/a/b) today.',
      'See the docs today.',
    ],
    ['an image keeps its alt text', '![a red cat](https://x.io/cat.png)', 'a red cat'],
    [
      'a bare URL becomes its host',
      'Visit https://docs.example.com/guide/start?x=1 now.',
      'Visit docs.example.com now.',
    ],
    ['an autolink becomes its host', 'Go to <https://example.org/path>.', 'Go to example.org.'],
    ['citation markers go', 'It is true [1] and proven [12].', 'It is true and proven.'],
    ['footnote refs go', 'A claim[^note] here.', 'A claim here.'],
    ['HTML tags go', 'Line one<br/>line two', 'Line one line two'],
    ['strikethrough keeps the words', 'It was ~~wrong~~ right.', 'It was wrong right.'],
    ['horizontal rules go', 'Above\n\n---\n\nBelow', 'Above\n\nBelow'],
    [
      'table pipes become commas, separator rows go',
      '| a | b |\n|---|---|\n| 1 | 2 |',
      'a, b 1, 2',
    ],
    [
      'whitespace collapses, paragraphs stay',
      'One   two\nthree\n\n\n\nFour',
      'One two three\n\nFour',
    ],
    ['CRLF input is normalised', 'One\r\n\r\nTwo', 'One\n\nTwo'],
    ['Arabic text is kept', 'مرحبا **بالعالم**.', 'مرحبا بالعالم.'],
    [
      'snake_case words are not treated as emphasis',
      'Use my_var_name here.',
      'Use my_var_name here.',
    ],
  ])('%s', (_label, input, expected) => {
    expect(toSpeakableText(input)).toBe(expected);
  });

  it('drops a fenced code block but keeps the text around it', () => {
    const input = 'Before.\n\n```ts\nconst x = 1;\nconsole.log(x);\n```\n\nAfter.';
    expect(toSpeakableText(input)).toBe('Before.\n\nAfter.');
  });

  it('drops an unterminated fenced code block to the end', () => {
    expect(toSpeakableText('Intro.\n\n```\nleft open')).toBe('Intro.');
  });

  it('drops a tilde fence and an indented code block', () => {
    expect(toSpeakableText('A.\n\n~~~\ncode\n~~~\n\n    indented code\n\nB.')).toBe('A.\n\nB.');
  });

  it('returns an empty string for a reply that is only code', () => {
    expect(toSpeakableText('```\nonly code\n```')).toBe('');
  });
});

describe('capSpeakableText', () => {
  it('leaves text within the cap untouched', () => {
    expect(capSpeakableText('Short.', 100)).toEqual({ text: 'Short.', truncated: false });
  });

  it('cuts at the last sentence end when it falls late enough', () => {
    const text = 'First sentence here. Second sentence here. Third one is long';
    expect(capSpeakableText(text, 50)).toEqual({
      text: 'First sentence here. Second sentence here.',
      truncated: true,
    });
  });

  it('cuts at a word boundary when the only sentence end is too early', () => {
    const text = 'Hi. aaaa bbbb cccc dddd eeee ffff gggg';
    const capped = capSpeakableText(text, 30);
    expect(capped.truncated).toBe(true);
    expect(capped.text).toBe('Hi. aaaa bbbb cccc dddd eeee');
  });

  it('hard-cuts a single word longer than the cap', () => {
    expect(capSpeakableText('x'.repeat(20), 10)).toEqual({ text: 'x'.repeat(10), truncated: true });
  });

  it('counts code points, so an emoji is one character', () => {
    expect(capSpeakableText('😀😀😀', 3)).toEqual({ text: '😀😀😀', truncated: false });
  });

  it('recognises a CJK full stop as a sentence end', () => {
    const text = '第一句话在这里。第二句话在这里。第三句';
    expect(capSpeakableText(text, 17).text).toBe('第一句话在这里。第二句话在这里。');
  });
});

describe('prepareSpeakableText', () => {
  it('cleans, caps, counts and hashes', () => {
    const prepared = prepareSpeakableText('**Hello** world.', 4_000);
    expect(prepared).toMatchObject({ text: 'Hello world.', characters: 12, truncated: false });
    expect(prepared.contentHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic and changes when the spoken text changes', () => {
    const a = prepareSpeakableText('Hello world.', 4_000).contentHash;
    expect(prepareSpeakableText('Hello world.', 4_000).contentHash).toBe(a);
    expect(prepareSpeakableText('Hello there.', 4_000).contentHash).not.toBe(a);
  });

  it('flags truncation of a reply longer than the cap', () => {
    const long = `${'word '.repeat(1_000)}end.`;
    const prepared = prepareSpeakableText(long, 4_000);
    expect(prepared.truncated).toBe(true);
    expect(prepared.characters).toBeLessThanOrEqual(4_000);
  });
});

describe('speechCharacterCount', () => {
  it('counts code points, not UTF-16 units', () => {
    expect(speechCharacterCount('a😀b')).toBe(3);
  });
});
