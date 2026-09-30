import { QUOTED_CONTEXT_HEADING } from '../../constants/message-quotes.constants';
import { latestUserTurnText, quotesFromMetadata, withQuotedContext } from '../quoted-turn.utility';
import { type ChatMessage } from '../../../../generated/prisma';
import { resolveRoutingContent } from '../attachment-only-turn.utility';

const quote = (text: string, sourceMessageId = 'm-1') => ({
  sourceMessageId,
  sourceRole: 'ASSISTANT',
  text,
});

describe('withQuotedContext', () => {
  it('leaves a turn with no quotes exactly as typed', () => {
    expect(withQuotedContext('hello', { fileIds: ['f'] })).toBe('hello');
    expect(withQuotedContext('hello', null)).toBe('hello');
  });

  it('puts the quoted lines above what the user typed, as a blockquote', () => {
    const result = withQuotedContext('Why?', { quotes: [quote('line one\nline two')] });

    expect(result).toBe(`${QUOTED_CONTEXT_HEADING}\n> line one\n> line two\n\nWhy?`);
  });

  it('separates several quotes and keeps their order', () => {
    const result = withQuotedContext('Compare', { quotes: [quote('A'), quote('B', 'm-2')] });

    expect(result).toBe(`${QUOTED_CONTEXT_HEADING}\n> A\n>\n> B\n\nCompare`);
  });

  it('sends the quote alone when nothing was typed', () => {
    expect(withQuotedContext('  ', { quotes: [quote('X')] })).toBe(
      `${QUOTED_CONTEXT_HEADING}\n> X`,
    );
  });

  it('ignores malformed quote JSON instead of throwing', () => {
    expect(quotesFromMetadata({ quotes: [{ text: 1 }, 'x', null] })).toEqual([]);
    expect(quotesFromMetadata({ quotes: 'nope' })).toEqual([]);
  });
});

describe('resolveRoutingContent with quotes', () => {
  it('routes a quote-only turn on the quoted text, since routing drops empty content', () => {
    const routed = resolveRoutingContent('', { quotes: [quote('the Paris itinerary')] });

    expect(routed).toContain('the Paris itinerary');
  });

  it('keeps the attachment hint for a file-only turn with no quote', () => {
    expect(resolveRoutingContent('', { fileIds: ['f'] })).toBe('Respond to the attached file(s).');
  });
});

describe('latestUserTurnText', () => {
  const row = (role: string, content: string, metadata: unknown = null): ChatMessage =>
    ({ id: role + content, threadId: 't', role, content, metadata }) as ChatMessage;

  it('returns the latest user turn with its quote, skipping later assistant turns', () => {
    const text = latestUserTurnText([
      row('USER', 'first'),
      row('USER', '', { quotes: [quote('the Louvre plan')] }),
      row('ASSISTANT', 'answer'),
    ]);

    expect(text).toContain('> the Louvre plan');
  });

  it('is undefined when there is no user turn, so callers keep their own default', () => {
    expect(latestUserTurnText([row('ASSISTANT', 'hi')])).toBeUndefined();
  });
});
