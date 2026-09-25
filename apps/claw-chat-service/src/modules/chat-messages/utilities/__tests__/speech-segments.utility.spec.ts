import { describe, expect, it } from 'vitest';

import {
  SPEECH_FIRST_SEGMENT_MAX_CHARACTERS,
  SPEECH_SEGMENT_MAX_CHARACTERS,
} from '../../constants/speech.constants';
import { speechCharacterCount } from '../speakable-text.utility';
import { segmentSpeakableText } from '../speech-segments.utility';

/** Rebuilds the text's words from the segments, to prove nothing was lost, added or reordered. */
function words(text: string): string[] {
  return text.split(/\s+/).filter((word) => word.length > 0);
}

describe('segmentSpeakableText', () => {
  it.each([
    ['empty', '', 0],
    ['whitespace only', '   \n  ', 0],
    ['one short sentence', 'Hello there.', 1],
    ['exactly the first limit', 'a'.repeat(SPEECH_FIRST_SEGMENT_MAX_CHARACTERS), 1],
  ])('%s → %i segment(s)', (_label, text, count) => {
    expect(segmentSpeakableText(text)).toHaveLength(count);
  });

  it('keeps the first segment short and the rest within the later limit, in order', () => {
    const text = Array.from(
      { length: 60 },
      (_, n) => `This is sentence ${String(n + 1)}, and it ends here.`,
    ).join(' ');
    const segments = segmentSpeakableText(text);
    expect(segments[0]?.characters).toBeLessThanOrEqual(SPEECH_FIRST_SEGMENT_MAX_CHARACTERS);
    for (const segment of segments.slice(1)) {
      expect(segment.characters).toBeLessThanOrEqual(SPEECH_SEGMENT_MAX_CHARACTERS);
    }
    expect(segments.map((segment) => segment.index)).toEqual(segments.map((_, n) => n));
    expect(words(segments.map((segment) => segment.text).join(' '))).toEqual(words(text));
  });

  it('cuts at a sentence end when one fits', () => {
    const first = 'Short opening sentence.';
    const text = `${first} ${'Then a much longer sentence follows here with many words. '.repeat(5)}`;
    expect(segmentSpeakableText(text)[0]?.text.endsWith('.')).toBe(true);
    expect(segmentSpeakableText(text, 40, 600)[0]?.text).toBe(first);
  });

  it('falls back to a clause break, then a space — never mid-word', () => {
    const clause = `${'word '.repeat(10)}then, ${'more '.repeat(30)}`;
    const cut = segmentSpeakableText(clause, 80, 600)[0]?.text ?? '';
    expect(cut.endsWith(',')).toBe(true);
    const plain = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda';
    for (const segment of segmentSpeakableText(plain, 20, 20)) {
      expect(words(plain)).toEqual(expect.arrayContaining(words(segment.text)));
      expect(segment.characters).toBeLessThanOrEqual(20);
    }
    expect(
      words(
        segmentSpeakableText(plain, 20, 20)
          .map((s) => s.text)
          .join(' '),
      ),
    ).toEqual(words(plain));
  });

  it('knows Arabic sentence marks and commas', () => {
    const arabic = 'هذه جملة أولى؟ وهذه جملة ثانية، طويلة بعض الشيء وتستمر. '.repeat(6);
    const segments = segmentSpeakableText(arabic, 40, 120);
    expect(segments[0]?.text.endsWith('؟')).toBe(true);
    expect(words(segments.map((segment) => segment.text).join(' '))).toEqual(words(arabic));
  });

  it('knows CJK sentence marks without spaces', () => {
    const chinese = '这是第一句话。这是第二句话，比较长一点。'.repeat(10);
    const segments = segmentSpeakableText(chinese, 12, 30);
    expect(segments[0]?.text.endsWith('。')).toBe(true);
    expect(segments.map((segment) => segment.text).join('')).toBe(chinese);
    for (const segment of segments.slice(1)) {
      expect(segment.characters).toBeLessThanOrEqual(30);
    }
  });

  it('counts code points, not UTF-16 units, and still cuts a break-less run at the limit', () => {
    const emoji = '😀'.repeat(50);
    const segments = segmentSpeakableText(emoji, 10, 20);
    expect(segments[0]?.characters).toBe(10);
    expect(segments.map((segment) => segment.text).join('')).toBe(emoji);
    expect(segments.every((segment) => segment.characters === speechCharacterCount(segment.text)));
  });

  it('treats a paragraph break as a boundary', () => {
    const text = `First paragraph without a stop\n\nSecond paragraph ${'x '.repeat(80)}`;
    expect(segmentSpeakableText(text, 60, 600)[0]?.text).toBe('First paragraph without a stop');
  });
});
