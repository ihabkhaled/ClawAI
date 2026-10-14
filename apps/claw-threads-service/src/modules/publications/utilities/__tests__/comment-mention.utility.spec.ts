import { parseMentionUsernames, stripCode } from '../comment-mention.utility';

describe('parseMentionUsernames', () => {
  it('finds distinct usernames lowercased in order of first appearance', () => {
    expect(parseMentionUsernames('hi @Ada and @bob_2, again @ADA!')).toEqual(['ada', 'bob_2']);
  });

  it('finds a mention beside Arabic text, with or without a space before the @', () => {
    expect(parseMentionUsernames('مرحبا @ada شكرا')).toEqual(['ada']);
    expect(parseMentionUsernames('@ada مرحبا')).toEqual(['ada']);
    expect(parseMentionUsernames('شكرا لك\n@bob-1\nمع السلامة')).toEqual(['bob-1']);
  });

  it('does not take an e-mail address, a double @ or a letter-glued @ as a mention', () => {
    expect(parseMentionUsernames('write to ada@example.com')).toEqual([]);
    expect(parseMentionUsernames('@@ada')).toEqual([]);
    expect(parseMentionUsernames('مرحبا@ada')).toEqual([]);
    expect(parseMentionUsernames('a.@ada')).toEqual([]);
  });

  it('does not match names that are too short, too long or followed by more letters', () => {
    expect(parseMentionUsernames('@ab')).toEqual([]);
    expect(parseMentionUsernames(`@${'a'.repeat(33)}`)).toEqual([]);
    expect(parseMentionUsernames('@adaمرحبا')).toEqual([]);
    expect(parseMentionUsernames(`@${'a'.repeat(32)}`)).toEqual(['a'.repeat(32)]);
  });

  it('ignores a mention inside inline or fenced code', () => {
    expect(parseMentionUsernames('run `ask @ada` then @bob')).toEqual(['bob']);
    expect(parseMentionUsernames('```\n@ada\n```\n@bob')).toEqual(['bob']);
  });

  it('treats an unclosed fence or backtick as plain text', () => {
    expect(parseMentionUsernames('``` @ada')).toEqual(['ada']);
    expect(parseMentionUsernames('` @ada\n` @bob')).toEqual(['ada', 'bob']);
  });

  it('keeps at most ten distinct mentions', () => {
    const text = Array.from({ length: 25 }, (_, index) => `@user${String(index)}`).join(' ');
    expect(parseMentionUsernames(text)).toHaveLength(10);
  });

  it('ignores zero-width and homoglyph tricks instead of resolving a different name', () => {
    expect(parseMentionUsernames('@a​da')).toEqual([]);
    expect(parseMentionUsernames('＠ada')).toEqual([]);
    expect(parseMentionUsernames('@аdа')).toEqual([]);
  });

  it('stays fast on hostile input of the maximum comment size', () => {
    const started = Date.now();
    const inputs = [
      '@'.repeat(5000),
      '`'.repeat(5000),
      '```'.repeat(1666),
      '@a'.repeat(2500),
      `${'@'.repeat(2500)}${'a'.repeat(2500)}`,
      `${'a'.repeat(4000)}@${'b'.repeat(999)}`,
      '`\n'.repeat(2500),
    ];
    for (const input of inputs) parseMentionUsernames(input);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe('stripCode', () => {
  it('replaces code spans and keeps everything else', () => {
    expect(stripCode('a `b` c')).toBe('a   c');
    expect(stripCode('x ```y``` z')).toBe('x   z');
    expect(stripCode('plain')).toBe('plain');
  });
});
