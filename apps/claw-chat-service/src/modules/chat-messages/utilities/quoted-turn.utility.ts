import { QUOTED_CONTEXT_HEADING } from '../constants/message-quotes.constants';
import type { ChatMessage } from '../../../generated/prisma';
import type { MessageQuote } from '../types/message-quote.types';

/** The quotes stored on a message's metadata, or none. Never throws on odd JSON. */
export function quotesFromMetadata(metadata: unknown): MessageQuote[] {
  if (metadata === null || typeof metadata !== 'object') return [];
  const quotes = (metadata as { quotes?: unknown }).quotes;
  return !Array.isArray(quotes) ? [] : quotes.filter(
    (quote): quote is MessageQuote =>
      typeof quote === 'object' &&
      quote !== null &&
      typeof (quote as MessageQuote).text === 'string' &&
      typeof (quote as MessageQuote).sourceMessageId === 'string',
  );
}

/**
 * A user turn as the model reads it when it quotes earlier text: the quoted
 * lines as a Markdown blockquote under a one-line heading, then what the user
 * typed. Assembled per request, never persisted — the stored message stays
 * exactly what the user typed, and the quote stays structured in metadata.
 */
export function withQuotedContext(content: string, metadata: unknown): string {
  const quotes = quotesFromMetadata(metadata);
  if (quotes.length === 0) return content;
  const blocks = quotes.map((quote) =>
    quote.text
      .split(/\r?\n/)
      .map((line) => `> ${line}`)
      .join('\n'),
  );
  const quoted = `${QUOTED_CONTEXT_HEADING}\n${blocks.join('\n>\n')}`;
  return content.trim().length === 0 ? quoted : `${quoted}\n\n${content}`;
}

/**
 * The latest USER turn as a model should read it — typed text plus any quote —
 * or undefined when there is no user turn. The one accessor for every path
 * that hands the user's request to a model (judge, critic, image and file
 * prompts, the estimate fallback). Paths that detect what the USER typed
 * ("continue", "remember this", edit intent) read `content` directly on
 * purpose: a quote is someone else's words.
 */
export function latestUserTurnText(messages: readonly ChatMessage[]): string | undefined {
  const lastUser = [...messages].reverse().find((message) => message.role === 'USER');
  return lastUser === undefined
    ? undefined
    : withQuotedContext(lastUser.content, lastUser.metadata);
}
