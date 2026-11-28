import { pickPartIndexes, splitTopic } from '../split-topic.utility';

describe('splitTopic', () => {
  it('keeps a short text as one part', () => {
    expect(splitTopic('hello world', 100)).toEqual(['hello world']);
    expect(splitTopic('', 100)).toEqual([]);
  });

  it('never loses or adds a character and never exceeds the part size', () => {
    const text = Array.from({ length: 200 }, (_u, i) => `Sentence number ${String(i)}. `).join('');
    const parts = splitTopic(text, 500);
    expect(parts.join('')).toBe(text);
    expect(parts.every((part) => part.length <= 500)).toBe(true);
    expect(parts.length).toBeGreaterThan(1);
  });

  it('prefers a blank line, then a line end, then a sentence end', () => {
    const para = `${'a'.repeat(80)}\n\n${'b'.repeat(30)}`;
    expect(splitTopic(para, 100)[0]).toBe(`${'a'.repeat(80)}\n\n`);
    const line = `${'a'.repeat(80)}\n${'b'.repeat(30)}`;
    expect(splitTopic(line, 100)[0]).toBe(`${'a'.repeat(80)}\n`);
    const sentence = `${'a'.repeat(80)}. ${'b'.repeat(30)}`;
    expect(splitTopic(sentence, 100)[0]).toBe(`${'a'.repeat(80)}. `);
  });

  it('cuts inside a word only when no break exists, and never inside a surrogate pair', () => {
    expect(splitTopic('x'.repeat(250), 100).map((part) => part.length)).toEqual([100, 100, 50]);
    const emoji = '😀'.repeat(60);
    const parts = splitTopic(emoji, 101);
    expect(parts.join('')).toBe(emoji);
    expect(parts[0]?.length).toBe(100);
  });

  it('splits unspaced Chinese at a full stop', () => {
    const text = `${'字'.repeat(80)}。${'字'.repeat(60)}`;
    expect(splitTopic(text, 100)[0]).toBe(`${'字'.repeat(80)}。`);
  });
});

describe('pickPartIndexes', () => {
  it('reads every part up to the bound', () => {
    expect(pickPartIndexes(3)).toEqual([0, 1, 2]);
    expect(pickPartIndexes(400)).toHaveLength(400);
  });

  it('samples evenly above the bound, first and last included, without repeats', () => {
    const picked = pickPartIndexes(1000);
    expect(picked).toHaveLength(400);
    expect(picked[0]).toBe(0);
    expect(picked[399]).toBe(999);
    expect(new Set(picked).size).toBe(400);
    expect(pickPartIndexes(10, 1)).toEqual([0]);
  });
});
