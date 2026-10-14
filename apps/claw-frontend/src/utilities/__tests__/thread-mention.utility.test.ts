import { describe, expect, it } from 'vitest';

import { ThreadMentionTokenKind } from '@/enums/thread-mention-token-kind.enum';
import {
  authorInitials,
  mentionPrefill,
  tokenizeMentions,
} from '@/utilities/thread-mention.utility';

/** Kind and value only; `start` is exercised by the key test below. */
function parts(content: string): Array<{ kind: ThreadMentionTokenKind; value: string }> {
  return tokenizeMentions(content).map(({ kind, value }) => ({ kind, value }));
}

const MENTION = ThreadMentionTokenKind.Mention;
const TEXT = ThreadMentionTokenKind.Text;

describe('tokenizeMentions', () => {
  it('splits plain text and @username parts, in order', () => {
    expect(parts('hi @ada_l, see @bob.')).toEqual([
      { kind: TEXT, value: 'hi ' },
      { kind: MENTION, value: 'ada_l' },
      { kind: TEXT, value: ', see ' },
      { kind: MENTION, value: 'bob' },
      { kind: TEXT, value: '.' },
    ]);
  });

  it('keeps an inner dot or dash in a name but not a trailing one', () => {
    expect(parts('@a.b-c.')).toEqual([
      { kind: MENTION, value: 'a.b-c' },
      { kind: TEXT, value: '.' },
    ]);
  });

  it('does not treat an email address or a doubled @ as a mention', () => {
    expect(parts('mail me@example.com')).toEqual([{ kind: TEXT, value: 'mail me@example.com' }]);
    expect(parts('@@x')).toEqual([{ kind: TEXT, value: '@@x' }]);
    expect(parts('@ alone')).toEqual([{ kind: TEXT, value: '@ alone' }]);
  });

  it('reads Arabic and other non-Latin names', () => {
    expect(parts('شكراً @أحمد')).toEqual([
      { kind: TEXT, value: 'شكراً ' },
      { kind: MENTION, value: 'أحمد' },
    ]);
  });

  it('leaves a very long run as plain text', () => {
    const long = `@${'a'.repeat(200)}`;
    expect(parts(long)).toEqual([{ kind: TEXT, value: long }]);
  });

  it('returns hostile markup as text parts only and never throws', () => {
    const hostile = '<img src=x onerror=alert(1)> @<script>alert(1)</script> @ok"onclick="x';
    const tokens = parts(hostile);
    expect(tokens.map((token) => token.value).join('')).toContain('<script>');
    expect(tokens.filter((token) => token.kind === MENTION).map((token) => token.value)).toEqual([
      'ok',
    ]);
  });

  it('finishes quickly on adversarial repetition', () => {
    const started = Date.now();
    parts(`${'@a'.repeat(50_000)} @${'.'.repeat(50_000)}`);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('gives every part a distinct start for use as a key', () => {
    const starts = tokenizeMentions('a @b c @d').map((token) => token.start);
    expect(new Set(starts).size).toBe(starts.length);
  });

  it('turns only the known usernames into mentions when a list is given', () => {
    const kinds = tokenizeMentions('@Ada @nobody_zz', ['ada']).map(({ kind, value }) => [
      kind,
      value,
    ]);
    expect(kinds).toEqual([
      [ThreadMentionTokenKind.Mention, 'Ada'],
      [ThreadMentionTokenKind.Text, ' @nobody_zz'],
    ]);
  });

  it('handles empty input', () => {
    expect(parts('')).toEqual([]);
  });
});

describe('mentionPrefill and authorInitials', () => {
  it('addresses the author, or nobody', () => {
    expect(mentionPrefill({ username: 'ada', displayName: 'Ada' })).toBe('@ada ');
    expect(mentionPrefill(null)).toBe('');
  });

  it('makes one or two capital letters, and a bullet for a symbol-only name', () => {
    expect(authorInitials({ username: 'ada', displayName: 'ada lovelace byron' })).toBe('AL');
    expect(authorInitials({ username: 'ada', displayName: '' })).toBe('A');
    expect(authorInitials({ username: '__', displayName: '👾' })).toBe('•');
    expect(authorInitials(null)).toBe('•');
  });
});
