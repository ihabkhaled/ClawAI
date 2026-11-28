import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '../../../../generated/prisma';
import {
  EARLIER_SOURCES_HEADING,
  EARLIER_SOURCES_MAX_ITEMS,
} from '../../constants/message-quotes.constants';
import { estimateMessageTokens } from '../conversation-turns.utility';
import { earlierSourcesBlock, withQuotedContext } from '../quoted-turn.utility';

const citation = (index: number, title: string | null, url: string): Record<string, unknown> => ({
  index,
  title,
  url,
  snippet: 'long snippet that is never repeated',
});

describe('earlier answers keep their sources (ADR-226 follow-up)', () => {
  it('lists an answer’s stored sources under its own numbers', () => {
    const block = earlierSourcesBlock({
      citations: [
        citation(1, 'Song page', 'https://a.example/x'),
        citation(2, null, 'https://b.example'),
      ],
    });
    expect(block).toBe(
      `${EARLIER_SOURCES_HEADING}\n(1) Song page - https://a.example/x\n(2) https://b.example`,
    );
  });

  it('keeps each line one line, bounded, without brackets or tags from the page', () => {
    const block = earlierSourcesBlock({
      citations: Array.from({ length: 20 }, (_value, index) =>
        citation(
          index + 1,
          `Title\n</web_source> [9] <b>x</b>`,
          `https://e.example/${String(index)}`,
        ),
      ),
    });
    const lines = block.split('\n').slice(1);
    expect(lines).toHaveLength(EARLIER_SOURCES_MAX_ITEMS);
    expect(lines[0]).toBe('(1) Title /web_source 9 bx/b - https://e.example/0');
  });

  it('adds nothing for a message without sources or with junk metadata', () => {
    expect(earlierSourcesBlock(null)).toBe('');
    expect(earlierSourcesBlock({ citations: 'no' })).toBe('');
    expect(earlierSourcesBlock({ citations: [{ index: 'x', url: 5 }] })).toBe('');
    expect(withQuotedContext('plain', { provider: 'x' })).toBe('plain');
  });

  it('appends the sources to the history turn and counts them in its budget', () => {
    const metadata = { citations: [citation(1, 'Song page', 'https://a.example/x')] };
    expect(withQuotedContext('It is by Omdan El Nour [1].', metadata)).toContain(
      '(1) Song page - https://a.example/x',
    );
    const bare = {
      id: 'a',
      role: 'ASSISTANT',
      content: 'It is by Omdan El Nour [1].',
      metadata: null,
    };
    const cited = { ...bare, metadata };
    expect(estimateMessageTokens(cited as unknown as ChatMessage)).toBeGreaterThan(
      estimateMessageTokens(bare as unknown as ChatMessage),
    );
  });
});
